import WebKit

/// Handles `window.webkit.messageHandlers.scanbass.postMessage({ action, payload })`
/// from the web app (see src/native/nativeBridge.js). Every call returns a Promise in JS.
@MainActor
final class NativeBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let handlerName = "scanbass"

    private let store: StoreManager
    weak var webView: WKWebView?

    init(store: StoreManager) {
        self.store = store
        super.init()
        store.onStateChange = { [weak self] in
            self?.pushStoreState()
        }
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String
        else {
            replyHandler(nil, "Malformed bridge message.")
            return
        }
        let payload = body["payload"] as? [String: Any] ?? [:]

        Task { @MainActor in
            do {
                replyHandler(try await self.handle(action: action, payload: payload), nil)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }
        }
    }

    private func handle(action: String, payload: [String: Any]) async throws -> Any? {
        switch action {
        case "store.getState":
            // A missing product (offline) is not an error: the paywall shows a retry state.
            _ = try? await store.loadProduct()
            await store.refreshEntitlements()
            return store.stateDictionary()

        case "store.purchase":
            let outcome = try await store.purchase()
            var state = store.stateDictionary()
            state["outcome"] = outcome.rawValue
            return state

        case "store.restore":
            try await store.restore()
            return store.stateDictionary()

        case "app.setKeepAwake":
            KeepAwake.shared.set(payload["value"] as? Bool ?? false)
            return nil

        default:
            throw NSError(
                domain: "Scanbass.NativeBridge",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Unknown bridge action: \(action)"]
            )
        }
    }

    /// Pushes entitlement changes that happen outside a JS call (Ask to Buy approval,
    /// purchase on another device, refund) to the page as a `scanbass:native` event.
    private func pushStoreState() {
        guard let webView,
              let data = try? JSONSerialization.data(withJSONObject: ["type": "store.state", "state": store.stateDictionary()]),
              let json = String(data: data, encoding: .utf8)
        else {
            return
        }

        webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('scanbass:native', { detail: \(json) }));")
    }
}
