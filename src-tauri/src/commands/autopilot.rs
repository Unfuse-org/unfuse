use tauri::State;
use crate::commands::CommandError;
use crate::pro_trait::AutopilotStepResult;
use crate::state::AppState;

/// Start an autopilot session: client supplies only the goal string.
/// The server generates the session ID and initializes the iteration counter to 0.
#[tauri::command]
pub async fn start_autopilot(
    goal: String,
    state: State<'_, AppState>,
) -> Result<String, CommandError> {
    if goal.trim().is_empty() {
        return Err(CommandError::InvalidInput("Goal cannot be empty".into()));
    }
    let session_id = state.autopilot.start_session(goal);
    Ok(session_id)
}

/// Run an autopilot step: client supplies ZERO step or counter arguments.
/// Iteration gating is strictly enforced via server-tracked state.
/// Multi-iteration passes (step >= 1) require a cryptographically verified `VerifiedLicense` token.
#[tauri::command]
pub async fn run_autopilot_step(
    state: State<'_, AppState>,
) -> Result<AutopilotStepResult, CommandError> {
    // 1. Read and validate session state in a scoped block (releases MutexGuard before await)
    let (goal, iteration_count) = {
        let session_guard = state.autopilot.current_session.lock().map_err(|_| {
            CommandError::Internal("Failed to acquire session lock".into())
        })?;

        let session = session_guard.as_ref().ok_or_else(|| {
            CommandError::InvalidState("No active autopilot session. Call start_autopilot first.".into())
        })?;

        (session.goal.clone(), session.iteration_count)
    };

    // 2. Execution: Free single pass (step 0) vs Pro multi-iteration self-healing (step 1+)
    let step_result = if iteration_count >= 1 {
        // Must obtain capability token via Ed25519 signature verification and Pro tier confirmation
        let verified_license = state.license.verify_pro().map_err(|e| {
            CommandError::ProRequired(format!(
                "Multi-iteration self-healing Autopilot requires an active Unfuse Pro license: {}",
                e
            ))
        })?;

        // Dispatch to pro engine with capability token (compiler-enforced)
        state.pro_engine.execute_autopilot_step(&goal, &verified_license)?
    } else {
        // Free core single-pass verification
        crate::autopilot::core_runner::execute_single_pass(&goal).await?
    };

    // 3. Increment server-side iteration counter ONLY upon successful step execution
    {
        let mut session_guard = state.autopilot.current_session.lock().map_err(|_| {
            CommandError::Internal("Failed to acquire session lock".into())
        })?;

        if let Some(session) = session_guard.as_mut() {
            session.iteration_count += 1;
        }
    }

    Ok(AutopilotStepResult {
        success: step_result.success,
        output: step_result.output,
        healed: step_result.healed,
    })
}
