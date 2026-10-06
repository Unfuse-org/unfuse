use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::{collections::HashMap, io::{Read, Write}, sync::{atomic::{AtomicU64, Ordering}, Mutex}};
use tauri::{ipc::Channel, State};

struct Session {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

impl Drop for Session {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[derive(Default)]
pub struct TerminalState {
    sessions: Mutex<HashMap<u64, Session>>,
    next_id: AtomicU64,
}

#[derive(Clone, serde::Serialize)]
#[serde(tag = "type", content = "data", rename_all = "lowercase")]
pub enum TerminalOutput {
    Data(Vec<u8>),
    Exit,
    Error(String),
}

fn size(rows: u16, cols: u16) -> Result<PtySize, String> {
    if rows == 0 || cols == 0 || rows > 1000 || cols > 1000 {
        return Err("Invalid terminal dimensions".into());
    }
    Ok(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
}

#[tauri::command]
pub fn terminal_open(state: State<'_, TerminalState>, rows: u16, cols: u16, output: Channel<TerminalOutput>) -> Result<u64, String> {
    let pair = native_pty_system().openpty(size(rows, cols)?).map_err(|e| e.to_string())?;
    let mut command = CommandBuilder::new(std::env::var("SHELL").unwrap_or_else(|_| if cfg!(windows) { "cmd.exe".into() } else { "/bin/sh".into() }));
    #[cfg(not(target_os = "windows"))]
    command.arg("-l");
    command.env("TERM", "xterm-256color");
    command.cwd(std::env::current_dir().map_err(|e| e.to_string())?);
    let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;
    let child = pair.slave.spawn_command(command).map_err(|e| e.to_string())?;
    drop(pair.slave);
    let id = state.next_id.fetch_add(1, Ordering::Relaxed);
    state.sessions.lock().map_err(|e| e.to_string())?.insert(id, Session { master: pair.master, writer, child });
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut bytes = [0u8; 8192];
        loop {
            match reader.read(&mut bytes) {
                Ok(0) => break,
                Ok(count) => if output.send(TerminalOutput::Data(bytes[..count].to_vec())).is_err() { break; },
                Err(error) => {
                    if error.kind() == std::io::ErrorKind::Interrupted { continue; }
                    // Unix PTYs can report EIO when the slave closes.
                    if error.raw_os_error() != Some(libc::EIO) { let _ = output.send(TerminalOutput::Error(error.to_string())); }
                    break;
                }
            }
        }
        let _ = output.send(TerminalOutput::Exit);
    });
    Ok(id)
}

#[tauri::command]
pub fn terminal_write(state: State<'_, TerminalState>, id: u64, data: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions.get_mut(&id).ok_or("Terminal is closed")?;
    session.writer.write_all(data.as_bytes()).and_then(|_| session.writer.flush()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn terminal_resize(state: State<'_, TerminalState>, id: u64, rows: u16, cols: u16) -> Result<(), String> {
    let sessions = state.sessions.lock().map_err(|e| e.to_string())?;
    sessions.get(&id).ok_or("Terminal is closed")?.master.resize(size(rows, cols)?).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn terminal_close(state: State<'_, TerminalState>, id: u64) -> Result<(), String> {
    state.sessions.lock().map_err(|e| e.to_string())?.remove(&id);
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::{sync::mpsc, time::Duration};

    #[test]
    fn shell_input_resize_and_cleanup() {
        let pair = native_pty_system().openpty(size(24, 80).unwrap()).unwrap();
        let reader = pair.master.try_clone_reader().unwrap();
        let writer = pair.master.take_writer().unwrap();
        let mut command = CommandBuilder::new("/bin/sh");
        command.arg("-i");
        let child = pair.slave.spawn_command(command).unwrap();
        drop(pair.slave);
        let mut session = Session { master: pair.master, writer, child };
        session.master.resize(size(32, 100).unwrap()).unwrap();
        let (send, receive) = mpsc::channel();
        std::thread::spawn(move || {
            let mut reader = reader;
            let mut result = Vec::new();
            let mut buffer = [0; 1024];
            while let Ok(count) = reader.read(&mut buffer) {
                if count == 0 { break; }
                result.extend_from_slice(&buffer[..count]);
            }
            let _ = send.send(result);
        });
        session.writer.write_all(b"printf 'PTY_%s_OK\\n' CHECK; stty size; exit\n").unwrap();
        session.writer.flush().unwrap();
        let output = receive.recv_timeout(Duration::from_secs(5)).expect("shell did not finish");
        let output = String::from_utf8_lossy(&output);
        assert!(output.contains("PTY_CHECK_OK"), "{output}");
        assert!(output.contains("32 100"), "{output}");
        assert!(session.child.wait().unwrap().success());
    }
}
