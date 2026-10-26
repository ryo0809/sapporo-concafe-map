// Public data is read directly by the Worker to keep map requests within a small CPU budget.
export const publicCafesSql = `SELECT c.id, c.name, c.area, c.category, c.address,
  c.building_id, b.name AS building_name, b.address AS building_address,
  c.floor_label, f.name AS floor_name,
  c.latitude, c.longitude, b.latitude AS building_latitude, b.longitude AS building_longitude,
  c.business_status, c.official_url, c.social_urls, c.verified_on,
  c.coordinate_source, c.fetched_at
  FROM cafes c
  LEFT JOIN buildings b ON b.id=c.building_id
  LEFT JOIN floors f ON f.id=c.floor_id
  WHERE c.deleted_at IS NULL
    AND c.publication_status='published'
    AND (c.publish_at IS NULL OR c.publish_at<=?)
    AND c.business_status NOT IN ('closed','temporarily_closed','moved')
  ORDER BY c.name`;

export async function readPublicCafes(db, now = new Date().toISOString()) {
  const {results} = await db.prepare(publicCafesSql).bind(now).all();
  return results.map(row => ({
    id: row.id, name: row.name, area: row.area, category: row.category,
    address: row.building_id ? row.building_address || row.address : row.address,
    tenantAddress: row.address,
    buildingName: row.building_name || '', floor: row.floor_name || row.floor_label || '',
    location: (row.building_latitude ?? row.latitude) === null || (row.building_longitude ?? row.longitude) === null
      ? null : {latitude: row.building_latitude ?? row.latitude, longitude: row.building_longitude ?? row.longitude},
    businessStatus: row.business_status === 'operating' ? 'operating' : 'unknown',
    officialUrl: row.official_url || '', socialUrls: JSON.parse(row.social_urls),
    verifiedOn: row.verified_on, locationGroup: row.building_id || row.id,
    coordinateSource: row.coordinate_source || '', fetchedAt: row.fetched_at || undefined,
  }));
}
