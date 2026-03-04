#pragma once

#include "PluginProcessor.h"

#include <juce_gui_extra/juce_gui_extra.h>

class BridgeWebView final : public juce::WebBrowserComponent
{
public:
  BridgeWebView();

  bool pageAboutToLoad(const juce::String& newURL) override;
  void pageFinishedLoading(const juce::String& url) override;
  bool pageLoadHadNetworkError(const juce::String& errorInfo) override;
};

class ScanbassVisualizerAudioProcessorEditor final
  : public juce::AudioProcessorEditor
  , private juce::Timer
{
public:
  explicit ScanbassVisualizerAudioProcessorEditor(ScanbassVisualizerAudioProcessor&);
  ~ScanbassVisualizerAudioProcessorEditor() override = default;

  void paint(juce::Graphics&) override;
  void resized() override;

private:
  void timerCallback() override;
  void loadBridgePage();
  void probeBridgeRuntimeState();
  void sendAudioFrameToWeb();
  void sendSceneConfigToWeb();
  juce::String buildAudioFrameScript(const ScanbassVisualizerAudioProcessor::WebAnalysisFrame& frame) const;
  juce::String buildSceneConfigScript() const;

  ScanbassVisualizerAudioProcessor& audioProcessor;
  juce::Label sceneLabel;
  juce::ComboBox sceneSelector;
  BridgeWebView webView;
  bool pendingSceneConfig = true;
  int bridgeProbeCountdownTicks = 30;
  int bridgeProbeAttemptsRemaining = 10;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ScanbassVisualizerAudioProcessorEditor)
};
