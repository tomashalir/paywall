import Foundation
import StoreKit

/// StoreKit 2 wrapper for the single non-consumable "Pro" unlock.
///
/// The iOS and macOS apps share one bundle identifier, so with Universal Purchase
/// enabled in App Store Connect a purchase on one platform unlocks the other.
@MainActor
final class StoreManager: ObservableObject {
    enum PurchaseOutcome: String {
        case purchased
        case pending
        case cancelled
    }

    enum StoreError: LocalizedError {
        case productUnavailable
        case failedVerification

        var errorDescription: String? {
            switch self {
            case .productUnavailable:
                return "Scanbass Pro is not available right now. Please try again later."
            case .failedVerification:
                return "The App Store could not verify this purchase."
            }
        }
    }

    /// Must match the product ID created in App Store Connect and in Scanbass.storekit.
    static let proProductID: String =
        Bundle.main.object(forInfoDictionaryKey: "ScanbassProProductID") as? String
        ?? "com.scanbass.visualizer.pro"

    @Published private(set) var isProUnlocked = false
    @Published private(set) var proProduct: Product?

    /// Called whenever the entitlement or product info changes, so the web view can be told.
    var onStateChange: (@MainActor () -> Void)?

    // Lives for the whole app session; StoreManager is never deallocated.
    private var updatesTask: Task<Void, Never>?

    init() {
        updatesTask = Task { [weak self] in
            await self?.listenForTransactionUpdates()
        }
        Task { [weak self] in
            await self?.refreshEntitlements()
        }
    }

    // MARK: - Public API

    func loadProduct() async throws -> Product {
        if let proProduct {
            return proProduct
        }

        guard let product = try await Product.products(for: [Self.proProductID]).first else {
            throw StoreError.productUnavailable
        }

        proProduct = product
        onStateChange?()
        return product
    }

    func purchase() async throws -> PurchaseOutcome {
        let product = try await loadProduct()
        let result = try await product.purchase()

        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            await refreshEntitlements()
            return .purchased
        case .pending:
            return .pending
        case .userCancelled:
            return .cancelled
        @unknown default:
            return .cancelled
        }
    }

    /// Required by App Review for non-consumables: lets users recover a purchase on a new device.
    func restore() async throws {
        try await AppStore.sync()
        await refreshEntitlements()
    }

    func refreshEntitlements() async {
        var unlocked = false
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else {
                continue
            }

            if transaction.productID == Self.proProductID, transaction.revocationDate == nil {
                unlocked = true
            }
        }

        if unlocked != isProUnlocked {
            isProUnlocked = unlocked
        }
        onStateChange?()
    }

    /// JSON-friendly snapshot sent to the web app.
    func stateDictionary() -> [String: Any] {
        var state: [String: Any] = ["isProUnlocked": isProUnlocked]
        if let proProduct {
            state["product"] = [
                "id": proProduct.id,
                "displayName": proProduct.displayName,
                "description": proProduct.description,
                "displayPrice": proProduct.displayPrice
            ]
        }
        return state
    }

    // MARK: - Private

    private func listenForTransactionUpdates() async {
        // Covers purchases completed outside the app's purchase flow: Ask to Buy approvals,
        // purchases on another device, refunds, and offer-code redemptions.
        for await result in Transaction.updates {
            if case .verified(let transaction) = result {
                await transaction.finish()
            }
            await refreshEntitlements()
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value):
            return value
        case .unverified:
            throw StoreError.failedVerification
        }
    }
}
