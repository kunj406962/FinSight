# Helper functions that recognize transfer-like and savings-like transaction descriptions.
SAVINGS_KEYWORDS = ["TO FIND & SAVE"]
TRANSFER_KEYWORDS = [
    "E-TRANSFER",
    "ONLINE BANKING TRANSFER",
    "BILL PAYMENT",
    "ONLINE TRANSFER",
    "PAYMENT - THANK YOU",
]


def is_savings(description: str) -> bool:
    """Return True when a description looks like a savings transfer."""
    description = description.upper()
    return any(keyword in description for keyword in SAVINGS_KEYWORDS)


def is_transfer(description: str) -> bool:
    """Return True when a description matches a known transfer pattern."""
    description = description.upper()
    return any(keyword in description for keyword in TRANSFER_KEYWORDS)