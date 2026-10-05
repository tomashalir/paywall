import SwiftUI
import UniformTypeIdentifiers
import WebKit
#if os(iOS)
import UIKit
#else
import AppKit
#endif

#if os(iOS)
typealias PlatformViewRepresentable = UIViewRepresentable
#else
typealias PlatformViewRepresentable = NSViewRepresentable
#endif

/// Hosts the Scanbass web build (bundled in the app's `web` folder) in a WKWebView.
struct VisualizerWebView: PlatformViewRepresentable {
    let store: StoreManager

    func makeCoordinator() -> Coordinator {
        Coordinator(store: store)
    }

    #if os(iOS)
    func makeUIView(context: Context) -> WKWebView {
        context.coordinator.makeWebView()
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
    #else
    func makeNSView(context: Context) -> WKWebView {
        context.coordinator.makeWebView()
    }

    func updateNSView(_ webView: WKWebView, context: Context) {}
    #endif

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private let bridge: NativeBridge

        init(store: StoreManager) {
            bridge = NativeBridge(store: store)
        }

        func makeWebView() -> WKWebView {
            let configuration = WKWebViewConfiguration()
            configuration.mediaTypesRequiringUserActionForPlayback = []
            #if os(iOS)
            configuration.allowsInlineMediaPlayback = true
            #endif

            if let webRoot = Bundle.main.resourceURL?.appendingPathComponent("web", isDirectory: true) {
                configuration.setURLSchemeHandler(BundleSchemeHandler(rootURL: webRoot), forURLScheme: BundleSchemeHandler.scheme)
            }

            let controller = configuration.userContentController
            controller.addScriptMessageHandler(bridge, contentWorld: .page, name: NativeBridge.handlerName)
            controller.addUserScript(WKUserScript(
                source: Self.bootstrapScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            ))

            let webView = WKWebView(frame: .zero, configuration: configuration)
            webView.navigationDelegate = self
            webView.uiDelegate = self
            webView.allowsBackForwardNavigationGestures = false
            webView.underPageBackgroundColor = .black
            #if os(iOS)
            webView.isOpaque = false
            webView.backgroundColor = .black
            webView.scrollView.backgroundColor = .black
            webView.scrollView.isScrollEnabled = false
            webView.scrollView.bounces = false
            webView.scrollView.contentInsetAdjustmentBehavior = .never
            #else
            webView.allowsMagnification = false
            #endif
            #if DEBUG
            if #available(iOS 16.4, macOS 13.3, *) {
                webView.isInspectable = true
            }
            #endif

            bridge.webView = webView
            webView.load(URLRequest(url: BundleSchemeHandler.startURL))
            return webView
        }

        private static var bootstrapScript: String {
            #if os(iOS)
            let platform = "ios"
            #else
            let platform = "macos"
            #endif
            return """
            window.__SCANBASS_NATIVE__ = Object.freeze({ platform: '\(platform)' });
            document.addEventListener('DOMContentLoaded', function () {
              var meta = document.querySelector('meta[name=viewport]');
              if (meta) {
                meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
              }
            });
            """
        }

        // MARK: WKNavigationDelegate

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }

            switch url.scheme {
            case BundleSchemeHandler.scheme, "blob", "about", "data":
                decisionHandler(.allow)
            default:
                // Anything else (e.g. a future support link) opens in the system browser.
                #if os(iOS)
                UIApplication.shared.open(url)
                #else
                NSWorkspace.shared.open(url)
                #endif
                decisionHandler(.cancel)
            }
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            // iOS can kill the web content process under memory pressure while backgrounded.
            webView.load(URLRequest(url: BundleSchemeHandler.startURL))
        }

        // MARK: WKUIDelegate

        #if os(macOS)
        /// macOS WKWebView does not show a file picker for <input type=file> on its own.
        func webView(
            _ webView: WKWebView,
            runOpenPanelWith parameters: WKOpenPanelParameters,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping ([URL]?) -> Void
        ) {
            let panel = NSOpenPanel()
            panel.canChooseFiles = true
            panel.canChooseDirectories = false
            panel.allowsMultipleSelection = parameters.allowsMultipleSelection
            panel.allowedContentTypes = [.audio]
            panel.message = "Choose an audio file to visualize"

            if let window = webView.window {
                panel.beginSheetModal(for: window) { response in
                    completionHandler(response == .OK ? panel.urls : nil)
                }
            } else {
                completionHandler(panel.runModal() == .OK ? panel.urls : nil)
            }
        }
        #endif
    }
}
