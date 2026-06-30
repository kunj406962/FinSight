import io
import pandas as pd
import pytest
from app.services.parsers.detector import detect_and_get_parser
from app.services.parsers.rbc_parser import RBCParser

RBC_SAMPLE_CSV = """Account Type,Account Number,Transaction Date,Cheque Number,Description 1,Description 2,CAD$,USD$
Chequing,02649-5147467,12/4/2023,,E-TRANSFER - AUTODEPOSIT JAY M PATEL C1ABBZ7WUWSY,,1000,
Chequing,02649-5147467,12/8/2023,,ONLINE BANKING TRANSFER - 1209,,-2,
"""


def _df_from_csv(csv_text: str) -> pd.DataFrame:
    return pd.read_csv(io.StringIO(csv_text))


def test_rbc_parser_parses_real_sample():
    df = _df_from_csv(RBC_SAMPLE_CSV)
    transactions = RBCParser().parse(df)

    assert len(transactions) == 2

    first = transactions[0]
    assert first.date.isoformat() == "2023-12-04"
    assert first.description == "E-TRANSFER - AUTODEPOSIT JAY M PATEL C1ABBZ7WUWSY"
    assert first.amount == 1000.0

    second = transactions[1]
    assert second.date.isoformat() == "2023-12-08"
    assert second.amount == -2.0


def test_detector_identifies_rbc():
    df = _df_from_csv(RBC_SAMPLE_CSV)
    bank, parser = detect_and_get_parser(df)
    assert bank == "rbc"
    assert parser is not None


def test_detector_falls_back_to_generic_for_unrecognized_format():
    csv_text = "Date,Details,Amount\n2024-01-01,COFFEE SHOP,-5.50\n"
    df = _df_from_csv(csv_text)
    bank, parser = detect_and_get_parser(df)
    assert bank == "unknown"
    assert parser is not None

    transactions = parser.parse(df)
    assert len(transactions) == 1
    assert transactions[0].description == "COFFEE SHOP"
    assert transactions[0].amount == -5.50


def test_detector_returns_none_for_unparseable_csv():
    csv_text = "Foo,Bar,Baz\n1,2,3\n"
    df = _df_from_csv(csv_text)
    bank, parser = detect_and_get_parser(df)
    assert bank == "unknown"
    assert parser is None


def test_rbc_parser_concatenates_both_description_fields():
    csv_text = (
        "Account Type,Account Number,Transaction Date,Cheque Number,"
        "Description 1,Description 2,CAD$,USD$\n"
        "Chequing,123,1/15/2024,,TIM HORTONS,STORE #4521,-4.50,\n"
    )
    df = _df_from_csv(csv_text)
    transactions = RBCParser().parse(df)
    assert transactions[0].description == "TIM HORTONS STORE #4521"