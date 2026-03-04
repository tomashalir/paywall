#include "PluginEditor.h"

namespace
{
  constexpr auto editorWidth = 1120;
  constexpr auto editorHeight = 700;
  constexpr auto controlHeight = 34;
  constexpr juce::int64 maxDebugLogSizeBytes = 5 * 1024 * 1024;

  juce::File getDebugLogFile()
  {
    return juce::File::getSpecialLocation(juce::File::userHomeDirectory)
      .getChildFile("Library")
      .getChildFile("Logs")
      .getChildFile("ScanbassVisualizer")
      .getChildFile("scanbass-debug.log");
  }

  juce::File getBundledWebAssetsDirectory()
  {
    const auto executable = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
    const auto macOsDirectory = executable.getParentDirectory();
    const auto contentsDirectory = macOsDirectory.getParentDirectory();
    const auto resourcesDirectory = contentsDirectory.getChildFile("Resources");
    return resourcesDirectory.getChildFile("WebAssets");
  }

  juce::File getBundledBridgeFile()
  {
    return getBundledWebAssetsDirectory().getChildFile("bridge.html");
  }

  juce::File getDevelopmentWebAssetsDirectory()
  {
#if defined(SCANBASS_DEV_DIST_DIR)
    return juce::File(SCANBASS_DEV_DIST_DIR);
#else
    return {};
#endif
  }

  void appendToDebugLog(const juce::String& message)
  {
    static juce::CriticalSection debugLogLock;
    const juce::ScopedLock lock(debugLogLock);

    const auto timestamp = juce::Time::getCurrentTime().formatted("[%Y-%m-%d %H:%M:%S.%3Q] ");
    const auto line = timestamp + message;

    juce::Logger::writeToLog(line);

    const auto logFile = getDebugLogFile();
    const auto logDirectory = logFile.getParentDirectory();
    if (!logDirectory.exists())
    {
      logDirectory.createDirectory();
    }

    if (logFile.existsAsFile() && logFile.getSize() > maxDebugLogSizeBytes)
    {
      logFile.deleteFile();
    }

    logFile.appendText(line + "\n", false, false, "\n");
  }

  std::vector<std::byte> readFileToBytes(const juce::File& file)
  {
    std::vector<std::byte> bytes;

    juce::FileInputStream stream(file);
    if (!stream.openedOk())
    {
      return bytes;
    }

    const auto length = stream.getTotalLength();
    if (length <= 0)
    {
      return bytes;
    }

    bytes.resize(static_cast<size_t>(length));
    const auto bytesRead = stream.read(bytes.data(), static_cast<size_t>(length));
    if (bytesRead != length)
    {
      bytes.clear();
      return bytes;
    }

    return bytes;
  }

  juce::String getMimeTypeForExtension(const juce::String& extension)
  {
    const auto ext = extension.toLowerCase();

    if (ext == "html" || ext == "htm")
      return "text/html";
    if (ext == "js" || ext == "mjs")
      return "text/javascript";
    if (ext == "css")
      return "text/css";
    if (ext == "json")
      return "application/json";
    if (ext == "svg")
      return "image/svg+xml";
    if (ext == "png")
      return "image/png";
    if (ext == "jpg" || ext == "jpeg")
      return "image/jpeg";
    if (ext == "woff2")
      return "font/woff2";
    if (ext == "woff")
      return "font/woff";

    return "application/octet-stream";
  }

#if JUCE_WEB_BROWSER_RESOURCE_PROVIDER_AVAILABLE
  std::optional<juce::WebBrowserComponent::Resource> getWebAssetResource(const juce::String& url)
  {
    const auto relativePath = url == "/" ? juce::String("bridge.html")
                                          : url.fromFirstOccurrenceOf("/", false, false);

    if (relativePath.contains("..") || relativePath.containsChar('\\'))
    {
      appendToDebugLog("[Scanbass/Resource] Rejected path traversal attempt: " + url);
      return std::nullopt;
    }

    juce::File file = getBundledWebAssetsDirectory().getChildFile(relativePath);
    if (!file.existsAsFile())
    {
      const auto devDirectory = getDevelopmentWebAssetsDirectory();
      if (devDirectory.isDirectory())
      {
        file = devDirectory.getChildFile(relativePath);
      }
    }

    if (!file.existsAsFile())
    {
      appendToDebugLog("[Scanbass/Resource] Missing asset: " + relativePath);
      return std::nullopt;
    }

    auto data = readFileToBytes(file);
    if (data.empty())
    {
      appendToDebugLog("[Scanbass/Resource] Empty/unreadable asset: " + file.getFullPathName());
      return std::nullopt;
    }

    juce::WebBrowserComponent::Resource resource;
    resource.data = std::move(data);
    resource.mimeType = getMimeTypeForExtension(file.getFileExtension().fromFirstOccurrenceOf(".", false, false));
    return resource;
  }
#endif

  juce::WebBrowserComponent::Options makeBridgeWebViewOptions()
  {
    auto options = juce::WebBrowserComponent::Options();
    auto appleOptions = juce::WebBrowserComponent::Options::AppleWkWebView()
                          .withAllowAccessToEnclosingDirectory(true);

    options = options.withAppleWkWebViewOptions(appleOptions)
                .withNativeIntegrationEnabled(true)
                .withEventListener(
                  "scanbassLog",
                  [](juce::var payload)
                  {
                    appendToDebugLog("[Scanbass/JS] " + juce::JSON::toString(payload, true));
                  });

#if JUCE_WEB_BROWSER_RESOURCE_PROVIDER_AVAILABLE
    options = options.withResourceProvider(
      [](const auto& url)
      {
        return getWebAssetResource(url);
      });
#endif

    return options;
  }
}

BridgeWebView::BridgeWebView()
  : juce::WebBrowserComponent(makeBridgeWebViewOptions())
{
}

bool BridgeWebView::pageAboutToLoad(const juce::String& newURL)
{
  appendToDebugLog("[Scanbass/WebView] pageAboutToLoad: " + newURL);
  return true;
}

void BridgeWebView::pageFinishedLoading(const juce::String& url)
{
  appendToDebugLog("[Scanbass/WebView] pageFinishedLoading: " + url);
}

bool BridgeWebView::pageLoadHadNetworkError(const juce::String& errorInfo)
{
  appendToDebugLog("[Scanbass/WebView] pageLoadHadNetworkError: " + errorInfo);
  return true;
}

ScanbassVisualizerAudioProcessorEditor::ScanbassVisualizerAudioProcessorEditor(ScanbassVisualizerAudioProcessor& owner)
  : AudioProcessorEditor(&owner)
  , audioProcessor(owner)
{
  setOpaque(true);
  setSize(editorWidth, editorHeight);

  sceneLabel.setText("Scene", juce::dontSendNotification);
  sceneLabel.setColour(juce::Label::textColourId, juce::Colours::white.withAlpha(0.8f));
  sceneLabel.setJustificationType(juce::Justification::centredLeft);
  addAndMakeVisible(sceneLabel);

  for (int sceneIndex = 1; sceneIndex <= 9; ++sceneIndex)
  {
    sceneSelector.addItem("Scene " + juce::String(sceneIndex), sceneIndex);
  }

  sceneSelector.setSelectedId(1, juce::dontSendNotification);
  sceneSelector.onChange = [this]
  {
    pendingSceneConfig = true;
    sendSceneConfigToWeb();
  };
  addAndMakeVisible(sceneSelector);

  addAndMakeVisible(webView);
  loadBridgePage();

  startTimerHz(30);
}

void ScanbassVisualizerAudioProcessorEditor::paint(juce::Graphics& g)
{
  g.fillAll(juce::Colour::fromRGB(5, 8, 12));
}

void ScanbassVisualizerAudioProcessorEditor::resized()
{
  auto bounds = getLocalBounds().reduced(10);
  auto controlArea = bounds.removeFromTop(controlHeight);
  sceneLabel.setBounds(controlArea.removeFromLeft(58));
  sceneSelector.setBounds(controlArea.removeFromLeft(180));
  bounds.removeFromTop(8);
  webView.setBounds(bounds);
}

void ScanbassVisualizerAudioProcessorEditor::timerCallback()
{
  if (bridgeProbeAttemptsRemaining > 0)
  {
    --bridgeProbeCountdownTicks;
    if (bridgeProbeCountdownTicks <= 0)
    {
      bridgeProbeCountdownTicks = 30;
      --bridgeProbeAttemptsRemaining;
      probeBridgeRuntimeState();
    }
  }

  sendAudioFrameToWeb();

  if (pendingSceneConfig)
  {
    sendSceneConfigToWeb();
  }
}

void ScanbassVisualizerAudioProcessorEditor::loadBridgePage()
{
  const auto executable = juce::File::getSpecialLocation(juce::File::currentExecutableFile);
  const auto bundledBridgeFile = getBundledBridgeFile();
  auto bridgeFile = bundledBridgeFile;

  if (!bridgeFile.existsAsFile())
  {
    bridgeFile = getDevelopmentWebAssetsDirectory().getChildFile("bridge.html");
  }

  appendToDebugLog("[Scanbass/Debug] log file: " + getDebugLogFile().getFullPathName());
  appendToDebugLog("[Scanbass/WebView] executable: " + executable.getFullPathName());
  appendToDebugLog("[Scanbass/WebView] bundled bridge path: " + bundledBridgeFile.getFullPathName());
  appendToDebugLog("[Scanbass/WebView] bundled bridge exists: " + juce::String(bundledBridgeFile.existsAsFile() ? "yes" : "no"));
  appendToDebugLog("[Scanbass/WebView] selected bridge path: " + bridgeFile.getFullPathName());

  if (!bridgeFile.existsAsFile())
  {
    jassertfalse;
    webView.goToURL("data:text/html;charset=utf-8,"
                    "<html><body style='background:#080b10;color:#dce4f5;font-family:system-ui;'>"
                    "<h2>Scanbass Bridge assets missing</h2>"
                    "<p>Expected bridge.html in plugin Resources/WebAssets.</p>"
                    "</body></html>");
    return;
  }

  const auto bridgeUrl = juce::URL(bridgeFile).toString(false);
#if JUCE_WEB_BROWSER_RESOURCE_PROVIDER_AVAILABLE
  juce::ignoreUnused(bridgeUrl);
  const auto resourceRootUrl = juce::WebBrowserComponent::getResourceProviderRoot();
  appendToDebugLog("[Scanbass/WebView] goToURL (resource provider): " + resourceRootUrl);
  webView.goToURL(resourceRootUrl);
#else
  appendToDebugLog("[Scanbass/WebView] goToURL: " + bridgeUrl);
  webView.goToURL(bridgeUrl);
#endif
}

void ScanbassVisualizerAudioProcessorEditor::probeBridgeRuntimeState()
{
  webView.evaluateJavascript(
    R"JS(
      (() => {
        try {
          const bodyStyle = window.getComputedStyle(document.body);
          return JSON.stringify({
            href: window.location.href,
            readyState: document.readyState,
            hasJUCE: !!window.__JUCE__,
            hasBackendEmit: !!(window.__JUCE__ && window.__JUCE__.backend && window.__JUCE__.backend.emitEvent),
            hasBridgeApi: !!window.ScanBassBridge,
            bodyBackground: bodyStyle.backgroundColor,
            rootExists: !!document.getElementById('bridge-root'),
            canvasExists: !!document.getElementById('scanbass-canvas'),
            scripts: Array.from(document.querySelectorAll('script[src]')).map((script) => script.src),
            styleSheets: Array.from(document.styleSheets).map((sheet) => sheet.href || 'inline')
          });
        } catch (error) {
          return JSON.stringify({
            probeError: error instanceof Error ? error.message : String(error)
          });
        }
      })();
    )JS",
    [](juce::WebBrowserComponent::EvaluationResult result)
    {
      if (const auto* error = result.getError())
      {
        appendToDebugLog("[Scanbass/Probe] JS eval error: " + error->message);
        return;
      }

      if (const auto* value = result.getResult())
      {
        appendToDebugLog("[Scanbass/Probe] " + value->toString());
        return;
      }

      appendToDebugLog("[Scanbass/Probe] JS eval returned no result");
    });
}

void ScanbassVisualizerAudioProcessorEditor::sendAudioFrameToWeb()
{
  const auto frame = audioProcessor.getLatestWebAnalysisFrame();
  webView.evaluateJavascript(buildAudioFrameScript(frame));
}

void ScanbassVisualizerAudioProcessorEditor::sendSceneConfigToWeb()
{
  webView.evaluateJavascript(buildSceneConfigScript());
  pendingSceneConfig = false;
}

juce::String ScanbassVisualizerAudioProcessorEditor::buildAudioFrameScript(
  const ScanbassVisualizerAudioProcessor::WebAnalysisFrame& frame) const
{
  juce::String json;
  json.preallocateBytes(2048);
  json << "{\"rms\":" << juce::String(frame.rms, 4) << ",\"peak\":" << juce::String(frame.peak, 4) << ",\"fft\":[";

  for (size_t index = 0; index < frame.fft.size(); ++index)
  {
    if (index != 0)
    {
      json << ",";
    }

    json << juce::String(frame.fft[index], 4);
  }

  json << "]}";

  juce::String script;
  script.preallocateBytes(2400);
  script << "if (window.ScanBassBridge && window.ScanBassBridge.onAudioFrame) "
         << "{ window.ScanBassBridge.onAudioFrame(" << json << "); }";
  return script;
}

juce::String ScanbassVisualizerAudioProcessorEditor::buildSceneConfigScript() const
{
  const auto selectedScene = juce::jlimit(1, 9, sceneSelector.getSelectedId());
  juce::String script;
  script << "if (window.ScanBassBridge && window.ScanBassBridge.onConfig) "
         << "{ window.ScanBassBridge.onConfig({ sceneId: 'scene" << selectedScene << "' }); }";
  return script;
}
