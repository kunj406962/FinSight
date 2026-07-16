# Shared parser abstractions for converting bank CSV data into normalized transactions.
from abc import ABC, abstractmethod
from datetime import date
import pandas as pd


class ParsedTransaction:
    """Represents a normalized transaction extracted from an uploaded statement."""
    def __init__(self, txn_date: date, description: str, amount: float):
        self.date = txn_date
        self.description = description
        self.amount = amount


class BaseParser(ABC):
    """Base interface for bank-specific CSV parsers."""
    @abstractmethod
    def parse(self, df: pd.DataFrame) -> list[ParsedTransaction]:
        """Parse a raw bank CSV dataframe into normalized transactions."""
        raise NotImplementedError