// RinascitaApp.swift — contenitore nativo iOS per il gioco web.
// Il gioco (HTML/CSS/JS) è incluso nell'app nella cartella "www"
// e gira in un WKWebView a tutto schermo: funziona completamente offline.
import SwiftUI
import WebKit

@main
struct RinascitaApp: App {
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
        }
    }
}

struct GameView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []   // l'audio parte al primo tocco
        config.websiteDataStore = .default()                    // salvataggi (localStorage) persistenti

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.17, green: 0.15, blue: 0.20, alpha: 1)
        web.scrollView.backgroundColor = web.backgroundColor
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never   // le safe area le gestisce il CSS
        web.allowsLinkPreview = false

        if let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            web.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
        }
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
