Pod::Spec.new do |s|
  s.name         = 'LivtetBranding'
  s.version      = '0.1.0'
  s.summary      = 'Livtet design tokens — colors, fonts, radii, spacing, and brand assets'
  s.homepage     = 'https://github.com/olamaelcu/livtet-branding'
  s.license      = { :type => 'UNLICENSED' }
  s.author       = { 'Olamaelcu' => '' }
  s.source       = { :git => 'https://github.com/olamaelcu/livtet-branding.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/LivtetBranding/**/*.swift'
  s.resources    = 'ios/Sources/LivtetBranding/Resources/**/*'
  s.platform     = :ios, '16.0'
  s.swift_version = '5.9'
end
