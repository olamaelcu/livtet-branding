// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "LivtetBranding",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(
            name: "LivtetBranding",
            targets: ["LivtetBranding"]
        ),
    ],
    targets: [
        .target(
            name: "LivtetBranding",
            path: "ios/Sources/LivtetBranding",
            resources: [
                .process("Resources")
            ]
        ),
    ]
)
