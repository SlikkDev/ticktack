import Capacitor
import UIKit

/// Registers the plugins that live in this app target rather than in a Swift
/// package, which Capacitor's auto-registration does not see.
class TickTackBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeSessionPlugin())
    }
}
