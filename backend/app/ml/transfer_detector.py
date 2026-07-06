SAVINGS_KEYWORDS = ["TO FIND & SAVE"]
TRANSFER_KEYWORDS = ["E-TRANSFER", "ONLINE BANKING TRANSFER", "BILL PAYMENT"]


def is_savings(description: str) -> bool:
    description = description.upper()
    return any(keyword in description for keyword in SAVINGS_KEYWORDS)


def is_transfer(description: str) -> bool:
    description = description.upper()
    return any(keyword in description for keyword in TRANSFER_KEYWORDS)