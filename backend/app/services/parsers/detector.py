import pandas as pd
from app.services.parsers.base_parser import BaseParser, ParsedTransaction
from app.services.parsers.rbc_parser import RBC_REQUIRED_COLUMNS, RBCParser

DATE_KEYWORDS = ("date",)
DESCRIPTION_KEYWORDS = ("description", "memo", "details", "payee")
AMOUNT_KEYWORDS = ("amount", "cad$", "usd$", "debit", "credit", "withdrawal", "deposit")


class GenericFallbackParser(BaseParser):
    """Best-effort parser for unrecognized bank formats. Heuristically finds
    date, description, and amount columns by header keyword matching."""

    def __init__(self, date_col: str, description_col: str, amount_col: str):
        self.date_col = date_col
        self.description_col = description_col
        self.amount_col = amount_col

    def parse(self, df: pd.DataFrame) -> list[ParsedTransaction]:
        transactions = []
        for _, row in df.iterrows():
            txn_date = pd.to_datetime(row[self.date_col]).date()
            description = str(row[self.description_col]).strip()
            amount = float(row[self.amount_col])
            transactions.append(
                ParsedTransaction(txn_date=txn_date, description=description, amount=amount)
            )
        return transactions


def _find_column(headers: list[str], keywords: tuple[str, ...]) -> str | None:
    for header in headers:
        if any(keyword in header.lower() for keyword in keywords):
            return header
    return None


def detect_and_get_parser(df: pd.DataFrame) -> tuple[str, BaseParser | None]:
    """Returns (bank_name, parser). parser is None if detection fails entirely."""
    headers = set(df.columns)

    if RBC_REQUIRED_COLUMNS.issubset(headers):
        return "rbc", RBCParser()

    columns = list(df.columns)
    date_col = _find_column(columns, DATE_KEYWORDS)
    description_col = _find_column(columns, DESCRIPTION_KEYWORDS)
    amount_col = _find_column(columns, AMOUNT_KEYWORDS)

    if date_col and description_col and amount_col:
        return "unknown", GenericFallbackParser(date_col, description_col, amount_col)

    return "unknown", None