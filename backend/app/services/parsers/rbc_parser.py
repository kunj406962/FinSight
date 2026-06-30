import pandas as pd
from app.services.parsers.base_parser import BaseParser, ParsedTransaction

RBC_REQUIRED_COLUMNS = {
    "Transaction Date",
    "Description 1",
    "Description 2",
    "CAD$",
    "USD$",
}


class RBCParser(BaseParser):
    def parse(self, df: pd.DataFrame) -> list[ParsedTransaction]:
        transactions = []
        for _, row in df.iterrows():
            txn_date = pd.to_datetime(row["Transaction Date"], format="%m/%d/%Y").date()

            desc_parts = [
                str(row[col]).strip()
                for col in ("Description 1", "Description 2")
                if pd.notna(row[col]) and str(row[col]).strip()
            ]
            description = " ".join(desc_parts)

            amount = row["CAD$"] if pd.notna(row["CAD$"]) else row["USD$"]

            transactions.append(
                ParsedTransaction(
                    txn_date=txn_date,
                    description=description,
                    amount=float(amount),
                )
            )
        return transactions