import io
import ipaddress
from datetime import datetime
from typing import Tuple, List
import pandas as pd


NETWORK_TRAFFIC_REQUIRED = [
    "timestamp",
    "source_ip",
    "destination_ip",
    "source_port",
    "destination_port",
    "protocol",
    "packet_count",
    "byte_count",
]

AUTH_EVENTS_REQUIRED = [
    "timestamp",
    "source_ip",
    "destination_ip",
    "service",
    "username",
    "auth_status",
]


def is_valid_ipv4(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(str(ip_str).strip())
        return ip.version == 4
    except ValueError:
        return False


def validate_and_parse_csv(file_bytes: bytes, filename: str) -> Tuple[str, pd.DataFrame]:
    """
    Validates CSV extension, parses content with Pandas, verifies required column headers,
    validates data types, and checks IP address validity.
    Returns: (log_type: 'network_traffic' | 'auth_events', parsed_df: pd.DataFrame)
    Raises ValueError with a detailed explanation on validation failure.
    """
    if not filename.lower().endswith(".csv"):
        raise ValueError(f"Invalid file extension for '{filename}'. Only .csv files are supported.")

    if not file_bytes or len(file_bytes.strip()) == 0:
        raise ValueError(f"Uploaded file '{filename}' is completely empty.")

    try:
        # Read with pandas
        df = pd.read_csv(io.BytesIO(file_bytes), skipinitialspace=True)
    except Exception as e:
        raise ValueError(f"Failed to parse CSV format: {str(e)}")

    if df.empty:
        raise ValueError(f"The CSV file '{filename}' contains no data rows.")

    # Normalize column names: strip whitespace and lowercase
    df.columns = [col.strip().lower() for col in df.columns]
    columns = set(df.columns)

    is_network_traffic = set(NETWORK_TRAFFIC_REQUIRED).issubset(columns)
    is_auth_events = set(AUTH_EVENTS_REQUIRED).issubset(columns)

    if not is_network_traffic and not is_auth_events:
        missing_net = [c for c in NETWORK_TRAFFIC_REQUIRED if c not in columns]
        missing_auth = [c for c in AUTH_EVENTS_REQUIRED if c not in columns]
        raise ValueError(
            f"Unrecognized CSV format in '{filename}'.\n"
            f"For network traffic, missing columns: {missing_net}\n"
            f"For authentication logs, missing columns: {missing_auth}"
        )

    log_type = "network_traffic" if is_network_traffic else "auth_events"

    # Row-by-row validation of critical fields
    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed accounting for CSV header row

        # 1. Validate Timestamp
        ts_val = str(row["timestamp"]).strip()
        if not ts_val or ts_val.lower() == "nan":
            raise ValueError(f"Row {row_num}: Missing required 'timestamp' field.")

        # 2. Validate Source IP
        src_ip = str(row["source_ip"]).strip()
        if not is_valid_ipv4(src_ip):
            raise ValueError(
                f"Row {row_num}: Invalid IPv4 address in 'source_ip': '{src_ip}'."
            )

        # 3. Validate Destination IP
        dst_ip = str(row["destination_ip"]).strip()
        if not is_valid_ipv4(dst_ip):
            raise ValueError(
                f"Row {row_num}: Invalid IPv4 address in 'destination_ip': '{dst_ip}'."
            )

        if log_type == "network_traffic":
            # Validate Ports
            try:
                src_port = int(row["source_port"])
                dst_port = int(row["destination_port"])
                if not (0 <= src_port <= 65535 and 0 <= dst_port <= 65535):
                    raise ValueError()
            except Exception:
                raise ValueError(
                    f"Row {row_num}: Port numbers must be integers between 0 and 65535."
                )

            # Validate Counts
            try:
                pkt_cnt = int(row["packet_count"])
                byte_cnt = int(row["byte_count"])
                if pkt_cnt < 0 or byte_cnt < 0:
                    raise ValueError()
            except Exception:
                raise ValueError(
                    f"Row {row_num}: 'packet_count' and 'byte_count' must be non-negative integers."
                )

        elif log_type == "auth_events":
            status_val = str(row["auth_status"]).strip().upper()
            if status_val not in ["SUCCESS", "FAILURE"]:
                raise ValueError(
                    f"Row {row_num}: 'auth_status' must be either 'SUCCESS' or 'FAILURE', got '{status_val}'."
                )

    return log_type, df
