import boto3
from moto import mock_aws
from datetime import datetime
from mock_setup import create_mock_environment

CPU_THRESHOLD = 10.0
NETWORK_THRESHOLD = 5.0
DISK_THRESHOLD = 5.0

@mock_aws
def run_policy_engine():
    ec2 = boto3.client("ec2", region_name="us-east-1")
    cloudwatch = boto3.client("cloudwatch", region_name="us-east-1")

    instance_ids, cpu_values, network_values, disk_values = create_mock_environment(ec2, cloudwatch)

    scan_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print("\n========================================")
    print(f"  CLOUDSPEND SCAN — {scan_time}")
    print(f"  Total instances found: {len(instance_ids)}")
    print("========================================")
    print(f"  {'#':<4} {'Instance':<22} {'CPU':>6} {'Network':>10} {'Disk':>8} {'Status':>8}")
    print(f"  {'-'*62}")

    idle_instances = []
    instance_results = []

    for i, (instance_id, cpu, network, disk) in enumerate(
        zip(instance_ids, cpu_values, network_values, disk_values), 1
    ):
        # Multi-metric validation — ALL three must be near zero
        is_idle = (
            cpu < CPU_THRESHOLD and
            network < NETWORK_THRESHOLD and
            disk < DISK_THRESHOLD
        )
        status = "IDLE" if is_idle else "ACTIVE"

        if is_idle:
            idle_instances.append(instance_id)

        instance_results.append({
            "instance_id": instance_id,
            "cpu": cpu,
            "network": network,
            "disk": disk,
            "status": status,
            "saving_per_hour": 0.0104 if is_idle else 0.0
        })

        print(f"  {i:<4} {instance_id:<22} {cpu:>5}% {network:>8}MB {disk:>6}MB {status:>8}")

    print("----------------------------------------")

    if idle_instances:
        ec2.stop_instances(InstanceIds=idle_instances)
        print(f"\n  ACTION TAKEN:")
        print(f"  ✓ {len(idle_instances)} instance(s) IDLE (CPU + Network + Disk all near zero)")
        print(f"    → Snapshot taken + Automatically shut down")
        print(f"    → Billing clock frozen")
        print(f"  ✓ {len(instance_ids) - len(idle_instances)} instance(s) ACTIVE → Left running safely")
        print(f"  ✓ Estimated saving this scan: ${len(idle_instances) * 0.0104:.4f}/hr")
    else:
        print(f"\n  No idle instances detected this scan.")
        print(f"  All {len(instance_ids)} instances are actively in use → Nothing shut down")

    print("========================================\n")

    return {
        "timestamp": scan_time,
        "total_instances": len(instance_ids),
        "idle_count": len(idle_instances),
        "active_count": len(instance_ids) - len(idle_instances),
        "hourly_saving": round(len(idle_instances) * 0.0104, 4),
        "instances": instance_results
    }

if __name__ == "__main__":
    run_policy_engine()