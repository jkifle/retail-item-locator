"""Input validation for API payloads."""

from typing import Any
import math


STRING_FIELDS = {
    "upc",
    "custom_sku",
    "ean",
    "manufacture_sku",
    "description",
    "category",
    "subcat_1",
    "subcat_2",
    "subcat_3",
    "brand",
}


def empty_to_none(value: Any) -> Any:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned if cleaned else None


def validate_product_payload(item: dict[str, Any]) -> tuple[bool, str]:
    if not isinstance(item, dict):
        return False, "Product row must be an object"

    if not empty_to_none(item.get("system_id")):
        return False, "system_id is required"

    for field in STRING_FIELDS:
        value = item.get(field)
        if value is not None and not isinstance(value, str):
            return False, f"{field} must be a string"

    if item.get("price") is not None:
        try:
            if isinstance(item["price"], bool) or not math.isfinite(float(item["price"])) or float(item["price"]) < 0:
                return False, "price must be a finite non-negative number"
        except (TypeError, ValueError):
            return False, "price must be a valid number"

    return True, ""


def validate_inventory_payload(item: dict[str, Any]) -> tuple[bool, str]:
    if not isinstance(item, dict):
        return False, "Inventory row must be an object"

    for field in ("upc", "shelf_id", "shelf_row", "item_position"):
        if item.get(field) is None or str(item.get(field)).strip() == "":
            return False, f"{field} is required"

    if item.get("store_id") is not None and not isinstance(item["store_id"], str):
        return False, "store_id must be a string"

    try:
        value = item["item_position"]
        if isinstance(value, bool) or str(int(value)) != str(value).strip() or int(value) < 1:
            return False, "item_position must be a positive integer"
    except (TypeError, ValueError):
        return False, "item_position must be an integer"

    return True, ""


def validate_bulk_products(products: Any) -> tuple[bool, str, list[dict[str, Any]]]:
    if not isinstance(products, list) or not products:
        return False, "Payload must be a non-empty list of products", []

    valid_items: list[dict[str, Any]] = []
    for index, item in enumerate(products):
        is_valid, message = validate_product_payload(item)
        if not is_valid:
            return False, f"Product row {index + 1}: {message}", []
        valid_items.append(item)

    if not valid_items:
        return False, "No valid products found in payload", []

    return True, "", valid_items


def validate_bulk_inventory(payload: Any) -> tuple[bool, str, list[dict[str, Any]]]:
    items = [payload] if isinstance(payload, dict) else payload
    if not isinstance(items, list) or not items:
        return False, "Payload must be a non-empty inventory object or list", []

    valid_items: list[dict[str, Any]] = []
    for index, item in enumerate(items):
        is_valid, message = validate_inventory_payload(item)
        if not is_valid:
            return False, f"Inventory row {index + 1}: {message}", []
        valid_items.append(item)

    if not valid_items:
        return False, "No valid inventory rows found in payload", []

    return True, "", valid_items


def validate_lookup_query(query: str, max_length: int = 255) -> tuple[bool, str]:
    if not isinstance(query, str) or not query.strip():
        return False, "Query cannot be empty"
    if len(query.strip()) > max_length:
        return False, f"Query cannot exceed {max_length} characters"
    return True, ""
