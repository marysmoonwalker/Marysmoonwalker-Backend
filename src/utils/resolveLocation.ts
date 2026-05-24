import geoip from 'geoip-lite';

export interface LocationInfo {
    country: string;
    city:    string;
}

/**
 * Resolves an IP address to a country and city using the local geoip-lite database.
 * Handles IPv4-mapped IPv6 addresses (e.g. "::ffff:197.210.1.1" → "197.210.1.1").
 * Returns "Unknown" for both fields if the IP cannot be resolved (e.g. localhost, private ranges).
 */
export const resolveLocation = (ip: string): LocationInfo => {
    // Strip the IPv4-mapped IPv6 prefix so geoip-lite can look it up correctly
    const cleanIp = ip?.replace(/^::ffff:/, '') ?? '';

    const geo = geoip.lookup(cleanIp);

    return {
        country: geo?.country ?? 'Unknown',
        city:    geo?.city    ?? 'Unknown',
    };
};