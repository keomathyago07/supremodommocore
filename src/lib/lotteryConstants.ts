export interface LotteryConfig {
  id: string;
  name: string;
  apiName: string;
  numbersCount: number;
  maxNumber: number;
  color: string;
  lockedPatterns: string[];
  drawTime: string;
  hasSpecial?: boolean;
  specialName?: string;
  specialCount?: number;
  specialMax?: number;
}

export const LOTTERIES: LotteryConfig[] = [
  {
    id: 'megasena', name: 'Mega Sena', apiName: 'mega-sena',
    numbersCount: 6, maxNumber: 60, color: '#209869',
    lockedPatterns: ['6 acertos', '5 acertos', '4 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'lotofacil', name: 'Lotofácil', apiName: 'lotofacil',
    numbersCount: 15, maxNumber: 25, color: '#930089',
    lockedPatterns: ['15 acertos', '14 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'quina', name: 'Quina', apiName: 'quina',
    numbersCount: 5, maxNumber: 80, color: '#260085',
    lockedPatterns: ['5 acertos', '4 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'lotomania', name: 'Lotomania', apiName: 'lotomania',
    numbersCount: 20, maxNumber: 100, color: '#F78100',
    lockedPatterns: ['20 acertos', '19 acertos', '18 acertos', '0 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'timemania', name: 'Timemania', apiName: 'timemania',
    numbersCount: 7, maxNumber: 80, color: '#00FF48',
    lockedPatterns: ['7 acertos', '6 acertos', '5 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'duplasena', name: 'Dupla Sena', apiName: 'dupla-sena',
    numbersCount: 6, maxNumber: 50, color: '#A61324',
    lockedPatterns: ['1º Sorteio - 6 acertos', '1º Sorteio - 5 acertos', '2º Sorteio - 6 acertos', '2º Sorteio - 5 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'diadesorte', name: 'Dia de Sorte', apiName: 'dia-de-sorte',
    numbersCount: 7, maxNumber: 31, color: '#CB852B',
    lockedPatterns: ['7 acertos', '6 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'supersete', name: 'Super Sete', apiName: 'super-sete',
    numbersCount: 7, maxNumber: 9, color: '#A8CF45',
    lockedPatterns: ['7 acertos', '6 acertos', '5 acertos'],
    drawTime: '21:00',
  },
  {
    id: 'maismilionaria', name: '+Milionária', apiName: 'mais-milionaria',
    numbersCount: 6, maxNumber: 50, color: '#0D2C6C',
    lockedPatterns: ['6 acertos + 2 trevos', '6 acertos + 1 ou 0 trevos', '5 acertos + 2 trevos', '5 acertos + 1 ou 0 trevos', '4 acertos + 2 trevos'],
    drawTime: '21:00',
    hasSpecial: true, specialName: 'Trevos', specialCount: 2, specialMax: 6,
  },
];

export const AI_SPECIALISTS = [
  'NeuralFreq', 'PatternMaster', 'DeepProb', 'QuantumPredict', 'StatEngine',
  'HotColdAnalyzer', 'SequenceHunter', 'GapDetector', 'FrequencyMapper', 'TrendSpotter',
  'CycleAnalyst', 'PrimeFilter', 'SumBalancer', 'ParityOptimizer', 'ZoneMapper',
  'ClusterFinder', 'RepeatTracker', 'DelayCalculator', 'WeightOptimizer', 'DistributionAI',
  'EntropyScanner', 'CorrelationNet', 'BayesPredictor', 'MarkovChain', 'MonteCarlo',
  'GeneticSelector', 'SwarmOptimizer', 'NeuralEvolver', 'ReinforceLearner', 'AdaptiveFilter',
  'FuzzyLogic', 'WaveletAnalyzer', 'FourierPredict', 'ChaosTheory', 'FractalPattern',
  'TimeSeriesAI', 'RegressionNet', 'AnomalyDetector', 'OutlierHunter', 'NormalizationAI',
  'CrossValidator', 'EnsembleVoter', 'BoostPredictor', 'ForestClassifier', 'SVMAnalyzer',
  'KNNPredictor', 'DBSCANCluster', 'PCAReducer', 'LDAClassifier', 'RBFNetwork',
  'LSTMPredictor', 'GRUAnalyzer', 'TransformerAI', 'AttentionNet', 'ConvPredictor',
  'AutoEncoder', 'VAEGenerator', 'GANPredictor', 'DiffusionModel', 'FlowNetwork',
  'GraphNeural', 'CapsuleNet', 'ResidualPredict', 'DenseConnect', 'SkipAnalyzer',
  'PoolingOptimizer', 'BatchNormalizer', 'DropoutRegular', 'L2Regularizer', 'AdamOptimizer',
  'SGDMomentum', 'RMSPropAI', 'AdaGradNet', 'NadamPredict', 'CosineScheduler',
  'WarmRestartAI', 'CyclicLearner', 'OneCyclePolicy', 'SnapEnsemble', 'StochasticDepth',
  'MixupTrainer', 'CutoutAugment', 'RandomEraseAI', 'ColorJitterNet', 'ElasticTransform',
  'GridDistort', 'OpticalFlowAI', 'MotionPredict', 'TemporalConv', 'SpatialAttention',
  'ChannelAttention', 'SENetPredictor', 'CBAMAnalyzer', 'NonLocalNet', 'SelfAttentionAI',
  'MultiHeadPredict', 'CrossAttentionAI', 'QueryKeyValue', 'PositionalEncode', 'SinusoidalAI',
  'LearnableEmbed', 'TokenMixerAI', 'PatchEmbed', 'WindowAttention', 'ShiftedWindow',
  'DeformableConv', 'DilatedPredict', 'DepthwiseSep', 'PointwiseConv', 'GroupConvAI',
  'OctaveConv', 'HarmonicNet', 'SteerableFilter', 'GaborPredict', 'LaplacianPyramid',
  'GaussianMixture', 'ExpectMaxAI', 'KMeansPredict', 'SpectralCluster', 'AgglomerativeAI',
  'BirchCluster', 'OPTICSAnalyzer', 'MeanShiftAI', 'AffinityPropag', 'SOMPredictor',
  'HopfieldNet', 'BoltzmannAI', 'EchoStateNet', 'LiquidStateAI', 'SpikingNeural',
  'NeuroEvolution', 'NEATPredictor', 'HyperNEATAI', 'CMAEvolution', 'DiffEvolution',
  'ParticleSwarm', 'AntColonyAI', 'BeeAlgorithm', 'FireflyOptimize', 'CuckooSearch',
  'BatAlgorithm', 'WhaleOptimizer', 'GrayWolfAI', 'HarrisHawkAI', 'SalpSwarm',
  'DragonFlyAI', 'MotherFlame', 'SineCosineAI', 'ArithmeticOpt', 'SlimeeMoldAI',
  'EquilibriumOpt', 'AquilaOptimizer', 'ChimpAlgorithm', 'AfricanVulture', 'CoatiOptimizer',
  'ReptileSearchAI', 'SnowAblation', 'GazelleFinder', 'FoxOptimizer', 'JellyfishSearch',
  'MountainClimber', 'RiverFormation', 'WindDrivenOpt', 'GravitySearchAI', 'BigBangCrunch',
  'BlackHoleOpt', 'SimAnnealAI', 'TabuSearchNet', 'HarmonySearch', 'ImperialistComp',
  'TeachLearnOpt', 'JayaAlgorithm', 'RainOptimizer', 'WaterCycleAI', 'TsunamiPredict',
];

export function getBrasiliaTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

export function formatBrasiliaTime(date: Date): string {
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatBrasiliaDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatBrasiliaHour(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) + 'h';
}
