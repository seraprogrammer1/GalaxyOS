import ipaddr from 'ipaddr.js';

const LOCAL_CIDRS = [
	'127.0.0.0/8',
	'::1/128',
	'10.0.0.0/8',
	'172.16.0.0/12',
	'192.168.0.0/16',
	'::ffff:0:0/96' // IPv4-mapped IPv6
] as const;

const parsedCIDRs = LOCAL_CIDRS.map((cidr) => ipaddr.parseCIDR(cidr));

export function isLocalIP(ip: string): boolean {
	if (!ip) return false;
	try {
		let addr = ipaddr.parse(ip);

		// Unwrap IPv4-mapped IPv6 (::ffff:x.x.x.x) to plain IPv4 for matching
		if (addr.kind() === 'ipv6') {
			const v6 = addr as ipaddr.IPv6;
			if (v6.isIPv4MappedAddress()) {
				addr = v6.toIPv4Address();
			}
		}

		return parsedCIDRs.some(([network, bits]) => {
			try {
				if (addr.kind() !== network.kind()) return false;
				return addr.match([network, bits]);
			} catch {
				return false;
			}
		});
	} catch {
		return false;
	}
}
