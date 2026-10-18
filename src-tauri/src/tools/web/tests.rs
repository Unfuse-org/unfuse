use super::*;
fn page(body: &str, kind: &str) -> Download {
    Download {
        url: Url::parse("https://example.com/docs/page").unwrap(),
        content_type: kind.into(),
        bytes: body.as_bytes().to_vec(),
    }
}

#[test]
fn fetch_extracts_html_without_executing_scripts_and_resolves_links() {
    let result=render_fetch(page("<html><title>Docs &amp; help</title><body><h1>Hello 世界</h1><p>Useful <b>content</b>.</p><script>hidden_script_payload</script><style>hidden_style_payload</style><template>hidden_template_payload</template><pre>let x = 1;\n  x += 2;</pre><a href='../reference'>Read more</a><a href='javascript:alert(1)'>Invalid</a></body></html>","text/html; charset=utf-8"),1,12000).unwrap();
    assert!(result.contains("Docs & help"));
    assert!(result.contains("Hello 世界"));
    assert!(result.contains("Useful"));
    assert!(result.contains("let x = 1;\n  x += 2;"));
    assert!(result.contains("https://example.com/reference"));
    assert!(result.contains("Untrusted external content"));
    assert!(!result.contains("hidden_script_payload"));
    assert!(!result.contains("hidden_style_payload"));
    assert!(!result.contains("hidden_template_payload"));
    assert!(!result.contains("javascript:"));
}

#[test]
fn text_fetch_paginates_unicode_and_discloses_capture_limits() {
    let result = render_fetch(page("a世界z", "text/plain"), 2, 2).unwrap();
    assert!(result.contains("Characters 2..3 of 4 captured\n世界"));
    assert!(result.contains("offset=4"));
    assert!(render_fetch(page("a世界z", "text/plain"), 6, 2).is_err());
    let result =
        render_fetch(page(&"界".repeat(MAX_TEXT + 1), "text/plain"), MAX_TEXT, 10).unwrap();
    assert!(result.contains("Extraction limited"));
    assert!(!result.contains("continue with"));
    assert!(render_fetch(page("binary\0content", "text/plain"), 1, 100).is_err());
    let invalid = Download {
        url: Url::parse("https://example.com").unwrap(),
        content_type: "text/plain".into(),
        bytes: vec![255, 254],
    };
    assert!(render_fetch(invalid, 1, 100).is_err());
}

#[test]
fn ddg_results_include_decoded_urls_snippets_and_no_ads_or_duplicates() {
    let html = r#"<div class="result result--ad"><a class="result__a" href="https://ad.example.com">Ad</a></div>
<div class="result"><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Frust-lang.org%2Flearn%3Fx%3D1%26y%3D2&amp;rut=tracking">Rust &amp; friends</a><div class="result__snippet">Read <b>official</b> docs.</div></div>
<div class="result"><a class="result__a" href="https://rust-lang.org/learn?x=1&amp;y=2">duplicate</a></div>
<div class="result"><a class="result__a" href="http://127.0.0.1/admin">Private</a></div>
<div class="result"><a class="result__a" href="https://docs.rs">Rust docs</a><div class="result__snippet">API reference</div></div>"#;
    let result = render_search(page(html, "text/html"), "Rust", 5).unwrap();
    assert!(result.contains("1. Rust & friends"));
    assert!(result.contains("https://rust-lang.org/learn?x=1&y=2"));
    assert!(result.contains("Read official docs."));
    assert!(result.contains("2. Rust docs"));
    assert!(!result.contains("tracking"));
    assert!(!result.contains("duplicate"));
    assert!(!result.contains("ad.example"));
    assert!(!result.contains("127.0.0.1"));
    assert!(!render_search(page(html, "text/html"), "Rust", 1)
        .unwrap()
        .contains("2. Rust docs"));
}

#[test]
fn ddg_empty_results_are_distinct_from_challenges_changed_markup_and_bad_content() {
    assert!(render_search(
        page(
            "<div class='no-results'>No results found</div>",
            "text/html"
        ),
        "absent",
        5
    )
    .unwrap()
    .contains("no results"));
    for html in [
        "<form id='challenge-form'></form>",
        "<form action='/anomaly.js'></form>",
        "<div class='anomaly-modal'></div>",
    ] {
        assert!(render_search(page(html, "text/html"), "Rust", 5)
            .unwrap_err()
            .contains("challenge"));
    }
    assert!(
        render_search(page("<html>Unknown markup</html>", "text/html"), "Rust", 5)
            .unwrap_err()
            .contains("no recognizable")
    );
    assert!(render_search(page("{}", "application/json"), "Rust", 5).is_err());
}

#[test]
fn web_arguments_reject_private_addresses_credentials_and_unsupported_fields() {
    for url in [
        "file:///etc/passwd",
        "ftp://example.com/file",
        "http://user:pass@example.com/",
        "http://127.0.0.1/",
        "http://2130706433/",
        "http://0x7f000001/",
        "http://10.0.0.1/",
        "http://169.254.169.254/",
        "http://192.168.1.1/",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://[fc00::1]/",
    ] {
        assert!(parse_url(url).is_err(), "{url} must be rejected");
    }
    assert!(parse_url("https://example.com/a?x=1#fragment")
        .unwrap()
        .fragment()
        .is_none());
    for (name, args) in [
        ("web_search", json!({"query":""})),
        ("web_search", json!({"query":"Rust","limit":21})),
        (
            "web_search",
            json!({"query":"Rust","api_key":"never-accepted"}),
        ),
        (
            "web_fetch",
            json!({"url":"https://example.com","limit":30001}),
        ),
        (
            "web_fetch",
            json!({"url":"https://example.com","headers":{}}),
        ),
        ("web_fetch", json!({"url":"https://example.com","offset":0})),
    ] {
        assert!(validate(name, &args).is_err());
    }
    for ip in [
        "0.0.0.0",
        "100.64.0.1",
        "172.16.0.1",
        "192.0.2.1",
        "198.18.0.1",
        "198.51.100.1",
        "203.0.113.1",
        "224.0.0.1",
        "::",
        "fe80::1",
        "2001:db8::1",
        "2002:a00:1::",
    ] {
        assert!(!public_ip(ip.parse().unwrap()), "{ip}");
    }
    for ip in [
        "1.1.1.1",
        "8.8.8.8",
        "2606:4700:4700::1111",
        "2001:4860:4860::8888",
    ] {
        assert!(public_ip(ip.parse().unwrap()), "{ip}");
    }
}

#[test]
fn web_supports_text_types_but_never_media_or_binary_types() {
    for kind in [
        "text/html; charset=utf-8",
        "text/plain",
        "text/markdown",
        "application/json",
        "application/xml",
        "application/problem+json",
    ] {
        assert!(supported_content_type(kind));
    }
    for kind in [
        "application/pdf",
        "image/png",
        "application/octet-stream",
        "",
    ] {
        assert!(!supported_content_type(kind));
    }
}

#[test]
fn web_pre_cancelled_requests_never_dispatch() {
    assert!(execute(
        "web_search",
        &json!({"query":"Rust"}),
        Arc::new(AtomicBool::new(true))
    )
    .unwrap_err()
    .contains("cancelled"));
}

#[test]
fn public_dns_policy_rejects_localhost_before_http() {
    tauri::async_runtime::block_on(async {
        assert!(public_addresses(&Url::parse("http://localhost/").unwrap())
            .await
            .unwrap_err()
            .contains("private"));
    });
}

#[test]
fn bounded_http_body_reader_rejects_oversize_and_preserves_text() {
    use std::{
        io::{Read, Write},
        net::TcpListener,
        thread,
    };
    for oversized in [false, true] {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let worker = thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            socket
                .set_read_timeout(Some(Duration::from_secs(3)))
                .unwrap();
            let mut data = [0; 4096];
            let _ = socket.read(&mut data);
            if oversized {
                write!(
                    socket,
                    "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    MAX_BODY + 1
                )
                .unwrap();
            } else {
                write!(
                    socket,
                    "HTTP/1.1 200 OK\r\nContent-Length: 6\r\nConnection: close\r\n\r\nhello!"
                )
                .unwrap();
            }
        });
        // This tests only the body reader. The production URL/DNS policy is never relaxed.
        tauri::async_runtime::block_on(async {
            let response = Client::builder()
                .no_proxy()
                .timeout(Duration::from_secs(3))
                .build()
                .unwrap()
                .get(format!("http://{address}"))
                .send()
                .await
                .unwrap();
            let result = read_body(response).await;
            if oversized {
                assert!(result.unwrap_err().contains("2 MiB"));
            } else {
                assert_eq!(result.unwrap(), b"hello!");
            }
        });
        worker.join().unwrap();
    }
}

#[test]
#[ignore = "Requires public network access; run explicitly to check current DDG and public fetch availability"]
fn live_ddg_and_public_fetch() {
    let flag = Arc::new(AtomicBool::new(false));
    let result = execute(
        "web_fetch",
        &json!({"url":"https://example.com","limit":1000}),
        flag.clone(),
    )
    .unwrap();
    assert!(result.contains("Example Domain"));
    let result = execute(
        "web_search",
        &json!({"query":"Rust programming language official website","limit":3}),
        flag,
    )
    .unwrap();
    assert!(result.contains("URL: https://"));
}

#[test]
fn redirect_targets_are_revalidated_and_cannot_downgrade_https() {
    let current = Url::parse("https://example.com/docs/start").unwrap();
    assert_eq!(
        redirect_target(&current, "../next").unwrap().as_str(),
        "https://example.com/next"
    );
    for location in [
        "https://127.0.0.1/admin",
        "https://[::ffff:10.0.0.1]/",
        "file:///etc/passwd",
        "https://user:pass@example.com/",
        "http://example.com/",
    ] {
        assert!(redirect_target(&current, location).is_err());
    }
    assert!(!public_ip("3fff::1".parse().unwrap()));
}
