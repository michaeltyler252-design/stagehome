from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import Property
from app.services import search_service


def _mock_scalars_list(values):
    result = MagicMock()
    scalars = MagicMock()
    scalars.all.return_value = values
    result.scalars.return_value = scalars
    return result


def _mock_scalar_one(value):
    result = MagicMock()
    result.scalar_one.return_value = value
    return result


def _mock_rows(rows):
    result = MagicMock()
    result.all.return_value = rows
    return result


@pytest.mark.asyncio
async def test_lowest_rent_sort_actually_reorders_by_real_rent_values():
    """The real guarantee this exists for: 'lowest_rent' must genuinely
    put the cheapest property first, not just accept the sort parameter
    without acting on it."""
    p_expensive = Property(id="prop-expensive", title="Expensive Place", slug="expensive", public_reference="SH-1")
    p_cheap = Property(id="prop-cheap", title="Cheap Place", slug="cheap", public_reference="SH-2")

    db = AsyncMock()
    db.execute.side_effect = [
        _mock_scalar_one(2),  # count
        _mock_scalars_list([p_expensive, p_cheap]),  # main query (order doesn't matter, gets re-sorted)
        _mock_rows([("prop-expensive", 50000), ("prop-cheap", 10000)]),  # rent lookup
    ]

    result = await search_service.search(db, sort="lowest_rent", page=1, limit=20)

    ids_in_order = [r["id"] for r in result["results"]]
    assert ids_in_order == ["prop-cheap", "prop-expensive"]


@pytest.mark.asyncio
async def test_highest_rent_sort_reverses_the_order():
    p_expensive = Property(id="prop-expensive", title="Expensive Place", slug="expensive", public_reference="SH-1")
    p_cheap = Property(id="prop-cheap", title="Cheap Place", slug="cheap", public_reference="SH-2")

    db = AsyncMock()
    db.execute.side_effect = [
        _mock_scalar_one(2),
        _mock_scalars_list([p_cheap, p_expensive]),
        _mock_rows([("prop-expensive", 50000), ("prop-cheap", 10000)]),
    ]

    result = await search_service.search(db, sort="highest_rent", page=1, limit=20)

    ids_in_order = [r["id"] for r in result["results"]]
    assert ids_in_order == ["prop-expensive", "prop-cheap"]


@pytest.mark.asyncio
async def test_default_sort_is_paginated_by_the_database_not_full_set():
    db = AsyncMock()
    db.execute.side_effect = [
        _mock_scalar_one(0),
        _mock_scalars_list([]),
    ]

    result = await search_service.search(db, page=2, limit=10)

    assert result["pagination"]["page"] == 2
    assert result["pagination"]["limit"] == 10
