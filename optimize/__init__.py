"""RootLedger optimizer — triple-return portfolio selection over NbS candidates."""
from .portfolio import optimize
from .economics import FACTORS, factor_table

__all__ = ["optimize", "FACTORS", "factor_table"]
