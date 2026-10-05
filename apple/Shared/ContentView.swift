import SwiftUI

struct ContentView: View {
    @ObservedObject var store: StoreManager

    var body: some View {
        VisualizerWebView(store: store)
            .ignoresSafeArea()
            .background(Color.black)
            #if os(iOS)
            .statusBarHidden(true)
            .persistentSystemOverlays(.hidden)
            #else
            .frame(minWidth: 720, minHeight: 480)
            #endif
    }
}
