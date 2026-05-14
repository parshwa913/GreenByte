const crypto = require('crypto');
const CatalogItem = require('../models/CatalogItem');
const env = require('../config/env');
const { round } = require('../utils/calculatePickupMetrics');

function buildEvidence(images = []) {
  return images.map((image) => ({
    fileName: image.fileName || '',
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes || Math.round((image.base64.length * 3) / 4),
    sha1: crypto.createHash('sha1').update(image.base64).digest('hex')
  }));
}

async function resolveCatalogHint(item) {
  if (item.catalogItemId) {
    return CatalogItem.findOne({ _id: item.catalogItemId, isActive: true }).lean();
  }

  if (item.category && item.name) {
    return CatalogItem.findOne({
      category: item.category,
      name: item.name,
      isActive: true
    }).lean();
  }

  if (item.category) {
    return CatalogItem.findOne({ category: item.category, isActive: true }).sort({ price: -1 }).lean();
  }

  return CatalogItem.findOne({ isActive: true }).sort({ price: -1 }).lean();
}

function buildFallbackEstimate({ item, images, catalogItem }) {
  const quantity = item.quantity || 1;
  const unit = catalogItem?.unit || 'pc';
  const workingFactor =
    item.condition === 'non_working'
      ? 0.65
      : item.condition === 'partially_working'
      ? 0.82
      : 1;
  const imageFactor = images.length >= 3 ? 1.03 : images.length === 1 ? 0.97 : 1;
  const basePrice = catalogItem?.price || 45;
  const estimatedPricePerUnit = round(basePrice * workingFactor * imageFactor);
  const estimatedWeightKgPerUnit =
    unit === 'kg' ? round(item.weightKg || 1.2) : round(catalogItem?.approximateWeightKg || 1);
  const estimatedTotal =
    unit === 'kg'
      ? round(quantity * estimatedWeightKgPerUnit * estimatedPricePerUnit)
      : round(quantity * estimatedPricePerUnit);

  return {
    suggestedItem: {
      category: catalogItem?.category || item.category || 'Mixed E-Scrap',
      name: catalogItem?.name || item.name || 'Unclassified E-Waste',
      unit
    },
    pricing: {
      estimatedPricePerUnit,
      estimatedWeightKgPerUnit,
      estimatedTotal,
      quantity,
      source: 'ml-fallback',
      modelVersion: 'heuristic-v1',
      confidence: catalogItem ? 0.72 : 0.46
    },
    rationale: [
      catalogItem
        ? `Matched the uploaded item to catalog entry ${catalogItem.name}.`
        : 'No exact catalog match was provided, so a generic e-waste fallback price was used.',
      item.condition
        ? `Adjusted estimate using the declared condition: ${item.condition.replace(/_/g, ' ')}.`
        : 'No condition was provided, so the estimate assumes average resale and scrap recovery value.',
      `Calculated from ${images.length} uploaded image${images.length > 1 ? 's' : ''}.`
    ]
  };
}

function normalizeExternalResponse(response, fallback, evidence, images) {
  return {
    suggestedItem: {
      category: response?.suggestedItem?.category || fallback.suggestedItem.category,
      name: response?.suggestedItem?.name || fallback.suggestedItem.name,
      unit: response?.suggestedItem?.unit || fallback.suggestedItem.unit
    },
    pricing: {
      estimatedPricePerUnit:
        Number.isFinite(response?.pricing?.estimatedPricePerUnit) && response.pricing.estimatedPricePerUnit > 0
          ? round(response.pricing.estimatedPricePerUnit)
          : fallback.pricing.estimatedPricePerUnit,
      estimatedWeightKgPerUnit:
        Number.isFinite(response?.pricing?.estimatedWeightKgPerUnit) && response.pricing.estimatedWeightKgPerUnit > 0
          ? round(response.pricing.estimatedWeightKgPerUnit)
          : fallback.pricing.estimatedWeightKgPerUnit,
      estimatedTotal:
        Number.isFinite(response?.pricing?.estimatedTotal) && response.pricing.estimatedTotal > 0
          ? round(response.pricing.estimatedTotal)
          : fallback.pricing.estimatedTotal,
      quantity: fallback.pricing.quantity,
      source: 'model-api',
      modelVersion: response?.pricing?.modelVersion || 'external-model',
      confidence:
        Number.isFinite(response?.pricing?.confidence) && response.pricing.confidence >= 0
          ? Math.min(1, response.pricing.confidence)
          : fallback.pricing.confidence
    },
    rationale: Array.isArray(response?.rationale) && response.rationale.length ? response.rationale : fallback.rationale,
    evidence: Array.isArray(response?.evidence) && response.evidence.length ? response.evidence : evidence,
    warnings:
      Array.isArray(response?.warnings) && response.warnings.length
        ? response.warnings
        : [`Processed ${images.length} uploaded image${images.length > 1 ? 's' : ''}.`]
  };
}

async function callExternalModel(payload, fallback, evidence) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.ML_MODEL_TIMEOUT_MS);

  try {
    const response = await fetch(env.ML_MODEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.ML_MODEL_API_KEY ? { Authorization: `Bearer ${env.ML_MODEL_API_KEY}` } : {})
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Model API returned ${response.status}`);
    }

    const data = await response.json();
    return normalizeExternalResponse(data, fallback, evidence, payload.images);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function estimatePickupImages({ item, images }) {
  const catalogItem = await resolveCatalogHint(item);
  const evidence = buildEvidence(images);
  const fallback = buildFallbackEstimate({ item, images, catalogItem });

  if (!env.ML_MODEL_API_URL) {
    return {
      ...fallback,
      evidence,
      warnings: ['ML_MODEL_API_URL is not configured, so the local fallback estimator was used.']
    };
  }

  try {
    return await callExternalModel(
      {
        item,
        images,
        catalogHint: catalogItem
          ? {
              category: catalogItem.category,
              name: catalogItem.name,
              unit: catalogItem.unit,
              price: catalogItem.price,
              approximateWeightKg: catalogItem.approximateWeightKg
            }
          : null
      },
      fallback,
      evidence
    );
  } catch (error) {
    return {
      ...fallback,
      evidence,
      warnings: [`External model request failed: ${error.message}. Fallback estimator was used instead.`]
    };
  }
}

module.exports = {
  estimatePickupImages
};
