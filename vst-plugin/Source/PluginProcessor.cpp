#include "PluginEditor.h"
#include "PluginProcessor.h"

#include <algorithm>
#include <cmath>

ScanbassVisualizerAudioProcessor::ScanbassVisualizerAudioProcessor()
  : AudioProcessor(BusesProperties()
      .withInput("Input", juce::AudioChannelSet::stereo(), true)
      .withOutput("Output", juce::AudioChannelSet::stereo(), true))
{
}

const juce::String ScanbassVisualizerAudioProcessor::getName() const
{
  return JucePlugin_Name;
}

bool ScanbassVisualizerAudioProcessor::acceptsMidi() const
{
  return false;
}

bool ScanbassVisualizerAudioProcessor::producesMidi() const
{
  return false;
}

bool ScanbassVisualizerAudioProcessor::isMidiEffect() const
{
  return false;
}

double ScanbassVisualizerAudioProcessor::getTailLengthSeconds() const
{
  return 0.0;
}

int ScanbassVisualizerAudioProcessor::getNumPrograms()
{
  return 1;
}

int ScanbassVisualizerAudioProcessor::getCurrentProgram()
{
  return 0;
}

void ScanbassVisualizerAudioProcessor::setCurrentProgram(int)
{
}

const juce::String ScanbassVisualizerAudioProcessor::getProgramName(int)
{
  return {};
}

void ScanbassVisualizerAudioProcessor::changeProgramName(int, const juce::String&)
{
}

void ScanbassVisualizerAudioProcessor::prepareToPlay(double, int)
{
  fftFifo.fill(0.0f);
  fftData.fill(0.0f);
  fftFifoIndex = 0;
  smoothedRms = 0.0f;
  smoothedPeak = 0.0f;
  latestRms.store(0.0f, std::memory_order_relaxed);
  latestPeak.store(0.0f, std::memory_order_relaxed);
  activeFftBufferIndex.store(0, std::memory_order_relaxed);
  publishedSequence.store(0, std::memory_order_relaxed);

  for (auto& buffer : fftBuffers)
  {
    buffer.fill(0.0f);
  }
}

void ScanbassVisualizerAudioProcessor::releaseResources()
{
}

bool ScanbassVisualizerAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
  const auto mainInput = layouts.getMainInputChannelSet();
  const auto mainOutput = layouts.getMainOutputChannelSet();

  if (mainInput != mainOutput)
  {
    return false;
  }

  return mainInput == juce::AudioChannelSet::mono() || mainInput == juce::AudioChannelSet::stereo();
}

void ScanbassVisualizerAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&)
{
  juce::ScopedNoDenormals noDenormals;
  const auto totalNumInputChannels = getTotalNumInputChannels();
  const auto totalNumOutputChannels = getTotalNumOutputChannels();
  const auto numSamples = buffer.getNumSamples();

  for (auto channel = totalNumInputChannels; channel < totalNumOutputChannels; ++channel)
  {
    buffer.clear(channel, 0, numSamples);
  }

  if (totalNumInputChannels <= 0 || numSamples <= 0)
  {
    latestRms.store(0.0f, std::memory_order_relaxed);
    latestPeak.store(0.0f, std::memory_order_relaxed);
    return;
  }

  double sumSquares = 0.0;
  float peak = 0.0f;
  const auto inverseChannels = 1.0f / static_cast<float>(totalNumInputChannels);

  for (int sampleIndex = 0; sampleIndex < numSamples; ++sampleIndex)
  {
    float monoSample = 0.0f;

    for (int channel = 0; channel < totalNumInputChannels; ++channel)
    {
      monoSample += buffer.getReadPointer(channel)[sampleIndex];
    }

    monoSample *= inverseChannels;
    peak = juce::jmax(peak, std::abs(monoSample));
    sumSquares += static_cast<double>(monoSample) * static_cast<double>(monoSample);
    pushNextSampleIntoFifo(monoSample);
  }

  const auto rms = std::sqrt(sumSquares / static_cast<double>(numSamples));
  smoothedRms = 0.9f * smoothedRms + 0.1f * static_cast<float>(rms);
  smoothedPeak = 0.82f * smoothedPeak + 0.18f * peak;

  latestRms.store(juce::jlimit(0.0f, 1.0f, smoothedRms), std::memory_order_release);
  latestPeak.store(juce::jlimit(0.0f, 1.0f, smoothedPeak), std::memory_order_release);
}

bool ScanbassVisualizerAudioProcessor::hasEditor() const
{
  return true;
}

juce::AudioProcessorEditor* ScanbassVisualizerAudioProcessor::createEditor()
{
  return new ScanbassVisualizerAudioProcessorEditor(*this);
}

void ScanbassVisualizerAudioProcessor::getStateInformation(juce::MemoryBlock&)
{
}

void ScanbassVisualizerAudioProcessor::setStateInformation(const void*, int)
{
}

void ScanbassVisualizerAudioProcessor::pushNextSampleIntoFifo(float sample) noexcept
{
  if (fftFifoIndex == fftSize)
  {
    return;
  }

  fftFifo[static_cast<size_t>(fftFifoIndex++)] = sample;

  if (fftFifoIndex == fftSize)
  {
    performSpectrumAnalysis();
    fftFifoIndex = 0;
  }
}

void ScanbassVisualizerAudioProcessor::performSpectrumAnalysis() noexcept
{
  std::fill(fftData.begin(), fftData.end(), 0.0f);
  std::copy(fftFifo.begin(), fftFifo.end(), fftData.begin());

  window.multiplyWithWindowingTable(fftData.data(), fftSize);
  fft.performFrequencyOnlyForwardTransform(fftData.data());

  constexpr auto epsilon = 1.0e-9f;
  const auto usableBinCount = fftSize / 2;
  std::array<float, bridgeFftSize> compactSpectrum {};

  for (int outputBin = 0; outputBin < bridgeFftSize; ++outputBin)
  {
    const auto startNorm = static_cast<float>(outputBin) / static_cast<float>(bridgeFftSize);
    const auto endNorm = static_cast<float>(outputBin + 1) / static_cast<float>(bridgeFftSize);
    const auto startSkew = std::pow(startNorm, 2.2f);
    const auto endSkew = std::pow(endNorm, 2.2f);

    const auto startIndex = juce::jlimit(
      0,
      usableBinCount - 1,
      static_cast<int>(startSkew * static_cast<float>(usableBinCount - 1)));
    const auto endIndex = juce::jlimit(
      startIndex + 1,
      usableBinCount,
      static_cast<int>(std::ceil(endSkew * static_cast<float>(usableBinCount))));

    float energySum = 0.0f;
    auto energyCount = 0;
    for (int fftIndex = startIndex; fftIndex < endIndex; ++fftIndex)
    {
      energySum += fftData[static_cast<size_t>(fftIndex)] / static_cast<float>(fftSize);
      ++energyCount;
    }

    const auto averageEnergy = energyCount > 0 ? energySum / static_cast<float>(energyCount) : 0.0f;
    const auto db = juce::Decibels::gainToDecibels(juce::jmax(averageEnergy, epsilon), minimumSpectrumDecibels);
    compactSpectrum[static_cast<size_t>(outputBin)] =
      juce::jlimit(0.0f, 1.0f, juce::jmap(db, minimumSpectrumDecibels, 0.0f, 0.0f, 1.0f));
  }

  publishSpectrum(compactSpectrum);
}

void ScanbassVisualizerAudioProcessor::publishSpectrum(const std::array<float, bridgeFftSize>& spectrum) noexcept
{
  const auto currentIndex = activeFftBufferIndex.load(std::memory_order_relaxed);
  const auto nextIndex = 1 - currentIndex;

  fftBuffers[static_cast<size_t>(nextIndex)] = spectrum;
  activeFftBufferIndex.store(nextIndex, std::memory_order_release);
  publishedSequence.fetch_add(1, std::memory_order_release);
}

ScanbassVisualizerAudioProcessor::WebAnalysisFrame ScanbassVisualizerAudioProcessor::getLatestWebAnalysisFrame() const noexcept
{
  WebAnalysisFrame frame;
  frame.rms = latestRms.load(std::memory_order_acquire);
  frame.peak = latestPeak.load(std::memory_order_acquire);

  while (true)
  {
    const auto sequenceBefore = publishedSequence.load(std::memory_order_acquire);
    const auto fftBufferIndex = activeFftBufferIndex.load(std::memory_order_acquire);
    frame.fft = fftBuffers[static_cast<size_t>(fftBufferIndex)];
    const auto sequenceAfter = publishedSequence.load(std::memory_order_acquire);

    if (sequenceBefore == sequenceAfter)
    {
      frame.sequence = sequenceAfter;
      break;
    }
  }

  return frame;
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
  return new ScanbassVisualizerAudioProcessor();
}
