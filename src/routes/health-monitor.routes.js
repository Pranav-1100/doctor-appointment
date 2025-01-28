const router = require('express').Router();
const HealthMonitorService = require('../services/health-monitor.service');
const { User, Chat } = require('../models');
const { authenticateToken } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');

// Wrapper for async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Get health trends analysis
router.get('/trends', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
  
    const trends = await HealthMonitorService.analyzeHealthTrends(req.user.id);
    res.json(trends);
  }));
  

// Generate comprehensive health report
router.get('/report', authenticateToken, asyncHandler(async (req, res) => {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
  
    const report = await HealthMonitorService.createHealthReport(req.user.id);
    res.json(report);
  }));
    

// Get recent symptoms analysis
router.get('/symptoms', authenticateToken, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const healthChats = await Chat.findAll({
    where: {
      userId: req.user.id,
      messageType: 'symptom_check',
      createdAt: { [Op.gte]: startDate }
    },
    order: [['createdAt', 'DESC']]
  });
  
  const symptomsAnalysis = await HealthMonitorService.extractRecentSymptoms(healthChats);
  res.json({
    timeframe: `${days} days`,
    total_interactions: healthChats.length,
    ...symptomsAnalysis
  });
}));

// Get health metrics
router.get('/metrics', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const metrics = await HealthMonitorService.calculateHealthMetrics(user);
  const recentChats = await Chat.findAll({
    where: {
      userId: req.user.id,
      createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    },
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  res.json({
    metrics,
    recent_activity: recentChats
  });
}));

// Get risk factors and recommendations
router.get('/risk-assessment', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const riskFactors = await HealthMonitorService.identifyRiskFactors(user);
  const recommendations = await HealthMonitorService.generateRecommendations(user);

  res.json({
    risk_factors: riskFactors,
    recommendations,
    last_updated: new Date()
  });
}));

// Get health summary dashboard
router.get('/dashboard', authenticateToken, asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const [metrics, riskFactors, recentChats] = await Promise.all([
    HealthMonitorService.calculateHealthMetrics(user),
    HealthMonitorService.identifyRiskFactors(user),
    Chat.findAll({
      where: {
        userId: req.user.id,
        createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    })
  ]);

  res.json({
    basic_info: {
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight
    },
    health_metrics: metrics,
    risk_factors: riskFactors,
    recent_activity: recentChats,
    medical_conditions: user.medical_conditions,
    allergies: user.allergies,
    last_updated: new Date()
  });
}));

// Track health metrics over time
router.get('/trends/metrics', authenticateToken, asyncHandler(async (req, res) => {
  const { metric, timeframe = '30' } = req.query;
  const startDate = new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000);

  const metrics = await HealthMonitorService.getMetricHistory(
    req.user.id,
    metric,
    startDate
  );

  res.json({
    metric,
    timeframe: `${timeframe} days`,
    data: metrics,
    trend_analysis: await HealthMonitorService.analyzeTrend(metrics)
  });
}));

module.exports = router;