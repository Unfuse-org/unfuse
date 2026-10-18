fn main() {
    let target = std::env::var("TARGET").expect("Cargo target is required");
    println!("cargo:rustc-env=UNFUSE_SRT_TARGET={target}");
    for path in [
        "../sandbox/runner.ts",
        "../scripts/build-sandbox.mjs",
        "../package-lock.json",
    ] {
        println!("cargo:rerun-if-changed={path}");
    }
    let status = std::process::Command::new("node")
        .args(["../scripts/build-sandbox.mjs", &target])
        .status()
        .expect("Node and Bun are required to build the packaged SRT helper");
    assert!(
        status.success(),
        "Cannot build the SRT helper; refusing an unsandboxed build"
    );
    tauri_build::build()
}
