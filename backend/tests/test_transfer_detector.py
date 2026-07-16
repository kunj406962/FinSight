# Tests covering the keyword-based transfer and savings detection helpers.
from app.ml.transfer_detector import is_savings, is_transfer


def test_is_savings_matches_real_string():
    assert is_savings("TO FIND & SAVE") is True


def test_is_savings_false_for_transfer():
    assert is_savings("E-TRANSFER SENT HARSHITA VRN4LB") is False


def test_is_transfer_matches_bill_payment():
    assert is_transfer("BILL PAYMENT BELL MOBILITY") is True


def test_is_transfer_matches_etransfer():
    assert is_transfer("E-TRANSFER SENT HARSHITA VRN4LB") is True


def test_is_transfer_matches_online_banking_transfer():
    assert is_transfer("ONLINE BANKING TRANSFER - 8214") is True


def test_is_transfer_false_for_unrelated_description():
    assert is_transfer("TIM HORTONS #1234") is False


def test_is_transfer_matches_online_transfer_to_deposit():
    assert is_transfer("ONLINE TRANSFER TO DEPOSIT ACCOUNT-3310") is True


def test_is_transfer_matches_credit_card_payment_confirmation():
    assert is_transfer("PAYMENT - THANK YOU / PAI EMENT - MERCI") is True