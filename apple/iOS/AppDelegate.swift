import AVFoundation
import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // `.playback` keeps music audible when the Ring/Silent switch is set to silent;
        // the default `.soloAmbient` category would mute the WKWebView audio.
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        } catch {
            print("Scanbass: failed to configure audio session: \(error)")
        }
        return true
    }
}
