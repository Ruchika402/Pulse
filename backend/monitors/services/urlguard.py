import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlparse

from asgiref.sync import sync_to_async

from monitors.models import BlockedHost


class SSRFError(Exception):
    """Raised when a URL is deemed unsafe to fetch."""

    pass


@dataclass
class SafeURL:
    original_url: str
    resolved_ip: str
    host_header: str
    is_https: bool


@sync_to_async
def is_host_blocked(host: str) -> bool:
    """Wraps the DB query so it is safe to call from async code."""
    return BlockedHost.objects.filter(host=host).exists()


async def validate_url(raw_url: str) -> SafeURL:
    """
    Step A: Parse and validate the URL, resolve its DNS, and ensure it points
    to a public IP address.
    """
    # 1. Basic URL parsing
    parsed = urlparse(raw_url)
    if parsed.scheme not in ("http", "https"):
        raise SSRFError(f"Invalid scheme: {parsed.scheme}. Only http and https are allowed.")

    if not parsed.hostname:
        raise SSRFError("URL must contain a hostname.")

    if parsed.username or parsed.password:
        raise SSRFError("Credentials in URLs are not allowed.")

    if len(raw_url) > 2048:
        raise SSRFError("URL is too long (max 2048 characters).")

    # Restrict ports
    port = parsed.port
    if port not in (None, 80, 443, 8080, 8443):
        raise SSRFError(f"Port {port} is not allowed. Only 80, 443, 8080, 8443 are allowed.")

    host = parsed.hostname.lower()

    # 2. Check BlockedHost (Now async-safe!)
    if await is_host_blocked(host):
        raise SSRFError(f"Host {host} is blocked by Pulse.")

    # 3. DNS Resolution and IP validation
    try:
        addr_info = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as e:
        raise SSRFError(f"DNS resolution failed: {e}") from e

    resolved_ips = set()
    for _family, _, _, _, sockaddr in addr_info:
        ip_str = sockaddr[0]
        resolved_ips.add(ip_str)

    if not resolved_ips:
        raise SSRFError("DNS returned no addresses.")

    for ip_str in resolved_ips:
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            raise SSRFError(f"Invalid IP address returned by DNS: {ip_str}") from None

        # Unwrap IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped

        # Reject non-global IPs (private, loopback, link-local, multicast, etc.)
        if not ip.is_global:
            raise SSRFError(f"Address {ip} is not a public IP. Local networks are blocked.")

    # We will connect to the first resolved IP
    first_ip = list(resolved_ips)[0]

    return SafeURL(
        original_url=raw_url,
        resolved_ip=first_ip,
        host_header=host,
        is_https=(parsed.scheme == "https"),
    )
