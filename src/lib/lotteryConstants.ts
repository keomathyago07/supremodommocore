export interface LotteryConfig {
  id: string;
  name: string;
  apiName: string;
  numbersCount: number;
  maxNumber: number;
  color: string;
  lockedPatterns: string[];
  drawTime: string;
  drawDays: number[]; // 0=Sunday, 1=Monday...6=Saturday
  hasSpecial?: boolean;
  specialName?: string;
  specialCount?: number;
  specialMax?: number;
  hasTeam?: boolean;
  teamName?: string;
  hasDualGame?: boolean; // Lotomania: 50 marked + 50 complementary
  dualGameName?: string;
  hasDualDraw?: boolean; // Dupla Sena: 2 draws per concurso
  hasColumns?: boolean; // Super Sete: 7 columns
  columnsCount?: number;
  columnMin?: number;
  columnMax?: number;
}

export const TIMEMANIA_TEAMS = [
  'ABC/RN', 'ASA/AL', 'Atlético/AC', 'Atlético/GO', 'Atlético/MG', 'Atlético/PR',
  'Avaí/SC', 'Bahia/BA', 'Barueri/SP', 'Botafogo/PB', 'Botafogo/RJ', 'Bragantino/SP',
  'Brasiliense/DF', 'Ceará/CE', 'Chapecoense/SC', 'Corinthians/SP', 'Coritiba/PR',
  'CRB/AL', 'Criciúma/SC', 'Cruzeiro/MG', 'CSA/AL', 'Cuiabá/MT', 'Figueirense/SC',
  'Flamengo/RJ', 'Fluminense/RJ', 'Fortaleza/CE', 'Goiás/GO', 'Grêmio/RS',
  'Guarani/SP', 'Inter de Limeira/SP', 'Internacional/RS', 'Ipatinga/MG', 'Ituano/SP',
  'Joinville/SC', 'Juventude/RS', 'Londrina/PR', 'Marília/SP', 'Mirassol/SP',
  'Náutico/PE', 'Operário/PR', 'Oeste/SP', 'Palmeiras/SP', 'Paraná/PR',
  'Paysandu/PA', 'Ponte Preta/SP', 'Portuguesa/SP', 'Remo/PA', 'Sampaio Corrêa/MA',
  'Santa Cruz/PE', 'Santo André/SP', 'Santos/SP', 'São Caetano/SP', 'São Paulo/SP',
  'Sport/PE', 'Treze/PB', 'Tombense/MG', 'Vasco/RJ', 'Vila Nova/GO', 'Vitória/BA',
  'XV de Piracicaba/SP', 'América/MG', 'América/RN', 'Aparecidense/GO', 'Confiança/SE',
  'Caxias/RS', 'Ferroviário/CE', 'Jacuipense/BA', 'Luverdense/MT', 'Novorizontino/SP',
  'Nova Iguaçu/RJ', 'Penapolense/SP', 'Rio Branco/AC', 'São Bento/SP', 'São José/RS',
  'Sobradinho/DF', 'Tupi/MG', 'União/MT', 'Volta Redonda/RJ',
];

export const LOTTERIES: LotteryConfig[] = [
  {
    id: 'megasena', name: 'Mega Sena', apiName: 'mega-sena',
    numbersCount: 6, maxNumber: 60, color: '#209869',
    lockedPatterns: ['6 acertos', '5 acertos', '4 acertos'],
    drawTime: '21:00',
    drawDays: [2, 4, 6],
  },
  {
    id: 'lotofacil', name: 'Lotofácil', apiName: 'lotofacil',
    numbersCount: 15, maxNumber: 25, color: '#930089',
    lockedPatterns: ['15 acertos', '14 acertos'],
    drawTime: '21:00',
    drawDays: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'quina', name: 'Quina', apiName: 'quina',
    numbersCount: 5, maxNumber: 80, color: '#260085',
    lockedPatterns: ['5 acertos', '4 acertos'],
    drawTime: '21:00',
    drawDays: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'lotomania', name: 'Lotomania', apiName: 'lotomania',
    numbersCount: 50, maxNumber: 100, color: '#F78100',
    lockedPatterns: ['20 acertos', '19 acertos', '18 acertos', '17 acertos', '16 acertos', '15 acertos', '0 acertos'],
    drawTime: '21:00',
    drawDays: [1, 3, 5],
    hasDualGame: true,
    dualGameName: 'Jogo Complementar (50 não marcados)',
  },
  {
    id: 'timemania', name: 'Timemania', apiName: 'timemania',
    numbersCount: 7, maxNumber: 80, color: '#00FF48',
    lockedPatterns: ['7 acertos', '6 acertos', '5 acertos'],
    drawTime: '21:00',
    drawDays: [2, 4, 6],
    hasTeam: true,
    teamName: 'Time do Coração',
  },
  {
    id: 'duplasena', name: 'Dupla Sena', apiName: 'dupla-sena',
    numbersCount: 6, maxNumber: 50, color: '#A61324',
    lockedPatterns: ['1º Sorteio - 6 acertos', '1º Sorteio - 5 acertos', '1º Sorteio - 4 acertos', '1º Sorteio - 3 acertos', '2º Sorteio - 6 acertos', '2º Sorteio - 5 acertos', '2º Sorteio - 4 acertos', '2º Sorteio - 3 acertos'],
    drawTime: '21:00',
    drawDays: [1, 3, 5],
    hasDualDraw: true,
  },
  {
    id: 'diadesorte', name: 'Dia de Sorte', apiName: 'dia-de-sorte',
    numbersCount: 7, maxNumber: 31, color: '#CB852B',
    lockedPatterns: ['7 acertos', '6 acertos'],
    drawTime: '21:00',
    drawDays: [2, 4, 6],
  },
  {
    id: 'supersete', name: 'Super Sete', apiName: 'super-sete',
    numbersCount: 7, maxNumber: 9, color: '#A8CF45',
    lockedPatterns: ['7 acertos', '6 acertos', '5 acertos'],
    drawTime: '21:00',
    drawDays: [1, 3, 5],
    hasColumns: true, columnsCount: 7, columnMin: 0, columnMax: 9,
  },
  {
    id: 'maismilionaria', name: '+Milionária', apiName: 'mais-milionaria',
    numbersCount: 6, maxNumber: 50, color: '#0D2C6C',
    lockedPatterns: ['6 acertos + 2 trevos', '6 acertos + 1 ou 0 trevos', '5 acertos + 2 trevos', '5 acertos + 1 ou 0 trevos', '4 acertos + 2 trevos'],
    drawTime: '21:00',
    drawDays: [3, 6],
    hasSpecial: true, specialName: 'Trevos', specialCount: 2, specialMax: 6,
  },
];

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function getDrawDayNames(lottery: LotteryConfig): string {
  return lottery.drawDays.map(d => DAY_NAMES[d]).join(', ');
}

export function getTodaysLotteries(): LotteryConfig[] {
  const today = getBrasiliaTime().getDay();
  return LOTTERIES.filter(l => l.drawDays.includes(today));
}

export function generateSpecialNumbers(config: LotteryConfig): number[] {
  if (config.hasSpecial && config.specialCount && config.specialMax) {
    const specials = new Set<number>();
    while (specials.size < config.specialCount) {
      specials.add(Math.floor(Math.random() * config.specialMax) + 1);
    }
    return Array.from(specials).sort((a, b) => a - b);
  }
  return [];
}

export function generateTeam(config: LotteryConfig): string | null {
  if (config.hasTeam) {
    return TIMEMANIA_TEAMS[Math.floor(Math.random() * TIMEMANIA_TEAMS.length)];
  }
  return null;
}

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
  // Pipeline engines
  'DataEngine', 'NormalizationEngine', 'FeatureEngineering', 'StatAnalysisEngine',
  'PatternDetectionEngine', 'CorrelationEngine', 'TemporalAnalysisEngine', 'SimulationEngine',
  'MLEngine', 'OptimizationEngine', 'FilteringEngine', 'CombinationGenerator',
  'BacktestingEngine', 'ScoringEngine', 'ReportingEngine',
  // Monte Carlo variants
  'MonteCarloSim100K', 'MonteCarloSim500K', 'MonteCarloSim1M', 'MonteCarloSim10M',
  // Advanced ML
  'XGBoostPredictor', 'RandomForestEngine', 'GradientBoostAI', 'MLPNeuralNet',
  'LSTMDeepPredictor', 'BayesianMLEngine',
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
