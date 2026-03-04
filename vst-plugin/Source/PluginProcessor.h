#pragma once

#include <array>
#include <atomic>
#include <cstdint>

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_dsp/juce_dsp.h>

class ScanbassVisualizerAudioProcessor final : public juce::AudioProcessor
{
public:
  static constexpr int fftOrder = 11;
  static constexpr int fftSize = 1 << fftOrder;
  static constexpr int bridgeFftSize = 64;

  struct WebAnalysisFrame
  {
    std::array<float, bridgeFftSize> fft {};
    float rms = 0.0f;
    float peak = 0.0f;
    uint32_t sequence = 0;
  };

  ScanbassVisualizerAudioProcessor();
  ~ScanbassVisualizerAudioProcessor() override = default;

  const juce::String getName() const override;
  bool acceptsMidi() const override;
  bool producesMidi() const override;
  bool isMidiEffect() const override;
  double getTailLengthSeconds() const override;

  int getNumPrograms() override;
  int getCurrentProgram() override;
  void setCurrentProgram(int index) override;
  const juce::String getProgramName(int index) override;
  void changeProgramName(int index, const juce::String& newName) override;

  void prepareToPlay(double sampleRate, int samplesPerBlock) override;
  void releaseResources() override;
  bool isBusesLayoutSupported(const BusesLayout& layouts) const override;

  void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

  bool hasEditor() const override;
  juce::AudioProcessorEditor* createEditor() override;

  void getStateInformation(juce::MemoryBlock& destData) override;
  void setStateInformation(const void* data, int sizeInBytes) override;

  WebAnalysisFrame getLatestWebAnalysisFrame() const noexcept;

private:
  static constexpr float minimumSpectrumDecibels = -90.0f;

  void pushNextSampleIntoFifo(float sample) noexcept;
  void performSpectrumAnalysis() noexcept;
  void publishSpectrum(const std::array<float, bridgeFftSize>& spectrum) noexcept;

  juce::dsp::FFT fft { fftOrder };
  juce::dsp::WindowingFunction<float> window { fftSize, juce::dsp::WindowingFunction<float>::hann };

  std::array<float, fftSize> fftFifo {};
  std::array<float, fftSize * 2> fftData {};
  int fftFifoIndex = 0;

  std::array<std::array<float, bridgeFftSize>, 2> fftBuffers {};
  std::atomic<int> activeFftBufferIndex { 0 };
  std::atomic<uint32_t> publishedSequence { 0 };

  float smoothedRms = 0.0f;
  float smoothedPeak = 0.0f;
  std::atomic<float> latestRms { 0.0f };
  std::atomic<float> latestPeak { 0.0f };

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ScanbassVisualizerAudioProcessor)
};
