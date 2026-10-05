import Foundation
#if os(iOS)
import UIKit
#else
import IOKit.pwr_mgt
#endif

/// Keeps the display awake while music is playing so the visual doesn't dim mid-track.
@MainActor
final class KeepAwake {
    static let shared = KeepAwake()

    #if os(macOS)
    private var assertionID: IOPMAssertionID = 0
    private var hasAssertion = false
    #endif

    func set(_ enabled: Bool) {
        #if os(iOS)
        UIApplication.shared.isIdleTimerDisabled = enabled
        #else
        if enabled, !hasAssertion {
            let result = IOPMAssertionCreateWithName(
                kIOPMAssertionTypePreventUserIdleDisplaySleep as CFString,
                IOPMAssertionLevel(kIOPMAssertionLevelOn),
                "Scanbass is visualizing audio" as CFString,
                &assertionID
            )
            hasAssertion = result == kIOReturnSuccess
        } else if !enabled, hasAssertion {
            IOPMAssertionRelease(assertionID)
            hasAssertion = false
        }
        #endif
    }
}
