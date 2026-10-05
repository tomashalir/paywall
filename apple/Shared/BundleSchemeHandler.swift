import Foundation
import UniformTypeIdentifiers
import WebKit

/// Serves the bundled Vite build (the `web` folder) at `scanbass://app/...`.
///
/// A custom scheme gives the page a stable origin, so ES modules, localStorage
/// (saved presets) and blob URLs (opened audio files) behave like they do on the web.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "scanbass"
    static let startURL = URL(string: "\(scheme)://app/index.html")!

    private let rootURL: URL

    init(rootURL: URL) {
        self.rootURL = rootURL.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        var relativePath = requestURL.path
        if relativePath.isEmpty || relativePath == "/" {
            relativePath = "/index.html"
        }

        let fileURL = rootURL.appendingPathComponent(String(relativePath.dropFirst())).standardizedFileURL

        // Never serve anything outside the bundled web folder.
        guard fileURL.path.hasPrefix(rootURL.path + "/"),
              let data = try? Data(contentsOf: fileURL)
        else {
            let response = HTTPURLResponse(url: requestURL, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(Data())
            urlSchemeTask.didFinish()
            return
        }

        let headers = [
            "Content-Type": Self.mimeType(for: fileURL),
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache"
        ]
        let response = HTTPURLResponse(url: requestURL, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Responses are delivered synchronously in start(), so there is nothing to cancel.
    }

    private static func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        default:
            return UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        }
    }
}
