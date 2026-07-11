from unittest.mock import MagicMock, patch

from app.ml import categorizer


def teardown_function():
    # _get_model is lru_cache-d; clear between tests so each test controls
    # its own fake model instead of reusing one from a previous test.
    categorizer._get_model.cache_clear()


def test_get_model_loads_once_and_caches():
    fake_model = MagicMock()
    with patch("app.ml.categorizer.joblib.load", return_value=fake_model) as mock_load:
        model_first_call = categorizer._get_model()
        model_second_call = categorizer._get_model()

    mock_load.assert_called_once_with(categorizer.MODEL_PATH)
    assert model_first_call is model_second_call is fake_model


def test_predict_category_returns_model_prediction():
    fake_model = MagicMock()
    fake_model.predict.return_value = ["Groceries"]

    with patch("app.ml.categorizer.joblib.load", return_value=fake_model):
        result = categorizer.predict_category("SOBEYS #1234")

    assert result == "Groceries"
    fake_model.predict.assert_called_once_with(["SOBEYS #1234"])


def test_predict_category_passes_raw_description_unmodified():
    # predict_category should not normalize/strip/upper the input itself —
    # per CONTEXT.md, normalization is the caller's responsibility (_classify).
    fake_model = MagicMock()
    fake_model.predict.return_value = ["Other"]

    with patch("app.ml.categorizer.joblib.load", return_value=fake_model):
        categorizer.predict_category("  lowercase raw text  ")

    fake_model.predict.assert_called_once_with(["  lowercase raw text  "])