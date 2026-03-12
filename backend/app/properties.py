import logging
import threading
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

_esol_model = None
_esol_transformers = None
_tox21_model = None
_tox21_tasks = None
_tox21_transformers = None

_esol_lock = threading.Lock()
_tox21_lock = threading.Lock()


def _ecfp_featurizer():
    """Return a fixed-size CircularFingerprint so all molecules produce uniform arrays."""
    import deepchem as dc

    return dc.feat.CircularFingerprint(size=1024)


def _get_esol_model():
    global _esol_model, _esol_transformers
    if _esol_model is not None:
        return _esol_model, _esol_transformers
    with _esol_lock:
        if _esol_model is not None:
            return _esol_model, _esol_transformers
        import deepchem as dc

        featurizer = _ecfp_featurizer()
        tasks, datasets, transformers = dc.molnet.load_delaney(
            featurizer=featurizer
        )
        train, valid, test = datasets
        model = dc.models.MultitaskRegressor(
            n_tasks=1,
            n_features=1024,
            layer_sizes=[1000, 500],
            dropouts=0.25,
            learning_rate=0.001,
        )
        model.fit(train, nb_epoch=50)
        _esol_model = model
        _esol_transformers = transformers
        logger.info("ESOL model trained and cached.")
    return _esol_model, _esol_transformers


def _get_tox21_model():
    global _tox21_model, _tox21_tasks, _tox21_transformers
    if _tox21_model is not None:
        return _tox21_model, _tox21_tasks, _tox21_transformers
    with _tox21_lock:
        if _tox21_model is not None:
            return _tox21_model, _tox21_tasks, _tox21_transformers
        import deepchem as dc

        featurizer = _ecfp_featurizer()
        tasks, datasets, transformers = dc.molnet.load_tox21(
            featurizer=featurizer, save_dir="/tmp/deepchem_data"
        )
        train, valid, test = datasets
        model = dc.models.MultitaskClassifier(
            n_tasks=len(tasks),
            n_features=1024,
            layer_sizes=[1000, 500],
            dropouts=0.25,
        )
        model.fit(train, nb_epoch=30)
        _tox21_model = model
        _tox21_tasks = tasks
        _tox21_transformers = transformers
        logger.info("Tox21 model trained and cached.")
    return _tox21_model, _tox21_tasks, _tox21_transformers



def predict_solubility(smiles_list: list[str]) -> list[Optional[float]]:
    """Predict ESOL log-solubility for a list of SMILES."""
    import deepchem as dc

    model, transformers = _get_esol_model()
    featurizer = dc.feat.CircularFingerprint(size=1024)
    features = featurizer.featurize(smiles_list)
    dataset = dc.data.NumpyDataset(X=features)
    predictions = model.predict(dataset)
    for t in reversed(transformers):
        predictions = t.untransform(predictions)
    return [
        round(float(p[0]), 3) if not np.isnan(p[0]) else None for p in predictions
    ]


def predict_toxicity(smiles_list: list[str]) -> list[Optional[dict[str, float]]]:
    """Predict Tox21 toxicity probabilities for a list of SMILES."""
    import deepchem as dc

    model, tasks, transformers = _get_tox21_model()
    featurizer = dc.feat.CircularFingerprint(size=1024)
    features = featurizer.featurize(smiles_list)
    n_samples = features.shape[0]
    dummy_y = np.zeros((n_samples, len(tasks)))
    dataset = dc.data.NumpyDataset(X=features, y=dummy_y)
    predictions = model.predict(dataset)
    results = []
    for pred in predictions:
        task_dict = {}
        for i, task_name in enumerate(tasks):
            try:
                if len(pred.shape) > 1 and pred.shape[-1] > 1:
                    val = float(pred[i][1])
                else:
                    val = float(pred[i])
                task_dict[task_name] = round(val, 4)
            except (IndexError, TypeError):
                task_dict[task_name] = 0.0
        results.append(task_dict)
    return results
