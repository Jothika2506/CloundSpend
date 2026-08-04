import boto3
import random

def create_mock_environment(ec2, cloudwatch):
    count = random.randint(3, 7)

    instances = ec2.run_instances(
        ImageId="ami-12345678",
        MinCount=count,
        MaxCount=count,
        InstanceType="t3.micro",
    )
    instance_ids = [i["InstanceId"] for i in instances["Instances"]]

    cpu_values = []
    network_values = []
    disk_values = []

    for _ in instance_ids:
        # Correlated metrics — if CPU is low, network and disk are also low
        cpu = round(random.uniform(0.5, 95.0), 1)
        if cpu < 10.0:
            # Genuinely idle — all metrics low
            network = round(random.uniform(0.1, 4.0), 1)
            disk = round(random.uniform(0.1, 4.0), 1)
        else:
            # Active — network and disk are higher
            network = round(random.uniform(5.0, 80.0), 1)
            disk = round(random.uniform(5.0, 60.0), 1)
        cpu_values.append(cpu)
        network_values.append(network)
        disk_values.append(disk)

    for instance_id, cpu, network, disk in zip(instance_ids, cpu_values, network_values, disk_values):
        # Push CPU metric
        cloudwatch.put_metric_data(
            Namespace="AWS/EC2",
            MetricData=[{
                "MetricName": "CPUUtilization",
                "Dimensions": [{"Name": "InstanceId", "Value": instance_id}],
                "Value": cpu,
                "Unit": "Percent"
            }]
        )
        # Push Network metric
        cloudwatch.put_metric_data(
            Namespace="AWS/EC2",
            MetricData=[{
                "MetricName": "NetworkIn",
                "Dimensions": [{"Name": "InstanceId", "Value": instance_id}],
                "Value": network,
                "Unit": "Megabytes"
            }]
        )
        # Push Disk metric
        cloudwatch.put_metric_data(
            Namespace="AWS/EC2",
            MetricData=[{
                "MetricName": "DiskReadBytes",
                "Dimensions": [{"Name": "InstanceId", "Value": instance_id}],
                "Value": disk,
                "Unit": "Megabytes"
            }]
        )

    return instance_ids, cpu_values, network_values, disk_values