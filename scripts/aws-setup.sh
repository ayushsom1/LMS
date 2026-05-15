#!/bin/bash
set -euo pipefail

# ============================================================
# AWS Infrastructure Setup Script for LMS
# Run this ONCE to provision all AWS resources
# Prerequisites: AWS CLI configured with your credentials
# ============================================================

REGION="ap-south-1"
APP_NAME="lms"
KEY_NAME="lms-key"
INSTANCE_TYPE="t3.large"  # 2 vCPU, 8 GB RAM
AMI_ID=""  # Will be auto-detected

echo "=== LMS AWS Infrastructure Setup ==="
echo "Region: $REGION"
echo ""

# ──────────────────────────────────────────
# Step 1: Create ECR Repository
# ──────────────────────────────────────────
echo "[1/6] Creating ECR repository..."
aws ecr create-repository \
  --repository-name "$APP_NAME-app" \
  --region "$REGION" \
  --image-scanning-configuration scanOnPush=true \
  2>/dev/null || echo "  ECR repo already exists"

ECR_URI=$(aws ecr describe-repositories \
  --repository-names "$APP_NAME-app" \
  --region "$REGION" \
  --query 'repositories[0].repositoryUri' \
  --output text)
echo "  ECR URI: $ECR_URI"

# ──────────────────────────────────────────
# Step 2: Create Security Group
# ──────────────────────────────────────────
echo "[2/6] Creating security group..."
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=is-default,Values=true" \
  --region "$REGION" \
  --query 'Vpcs[0].VpcId' \
  --output text)

SG_ID=$(aws ec2 create-security-group \
  --group-name "$APP_NAME-sg" \
  --description "LMS application security group" \
  --vpc-id "$VPC_ID" \
  --region "$REGION" \
  --query 'GroupId' \
  --output text \
  2>/dev/null) || SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$APP_NAME-sg" \
  --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow SSH, HTTP, HTTPS
for PORT in 22 80 443; do
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port "$PORT" \
    --cidr 0.0.0.0/0 \
    --region "$REGION" \
    2>/dev/null || true
done

echo "  Security Group: $SG_ID"

# ──────────────────────────────────────────
# Step 3: Create SSH Key Pair
# ──────────────────────────────────────────
echo "[3/6] Creating SSH key pair..."
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query 'KeyMaterial' \
    --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "  Key saved to ${KEY_NAME}.pem — KEEP THIS SAFE!"
else
  echo "  Key pair already exists"
fi

# ──────────────────────────────────────────
# Step 4: Find latest Ubuntu 22.04 AMI
# ──────────────────────────────────────────
echo "[4/6] Finding Ubuntu 22.04 AMI..."
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --region "$REGION" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)
echo "  AMI: $AMI_ID"

# ──────────────────────────────────────────
# Step 5: Launch EC2 Instance
# ──────────────────────────────────────────
echo "[5/6] Launching EC2 instance ($INSTANCE_TYPE)..."

# User data script to install Docker on first boot
USER_DATA=$(cat <<'USERDATA'
#!/bin/bash
apt-get update -y
apt-get install -y docker.io docker-compose-plugin git awscli
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Install Docker Compose standalone
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /home/ubuntu/lms
chown ubuntu:ubuntu /home/ubuntu/lms
USERDATA
)

INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --user-data "$USER_DATA" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME-server}]" \
  --region "$REGION" \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "  Instance ID: $INSTANCE_ID"
echo "  Waiting for instance to be running..."

aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# ──────────────────────────────────────────
# Step 6: Allocate Elastic IP
# ──────────────────────────────────────────
echo "[6/6] Allocating Elastic IP..."
ALLOC_ID=$(aws ec2 allocate-address \
  --domain vpc \
  --region "$REGION" \
  --query 'AllocationId' \
  --output text)

aws ec2 associate-address \
  --instance-id "$INSTANCE_ID" \
  --allocation-id "$ALLOC_ID" \
  --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids "$ALLOC_ID" \
  --region "$REGION" \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo ""
echo "============================================================"
echo "  AWS Setup Complete!"
echo "============================================================"
echo ""
echo "  EC2 Instance:  $INSTANCE_ID"
echo "  Public IP:     $PUBLIC_IP"
echo "  ECR Registry:  $ECR_URI"
echo "  SSH Key:       ${KEY_NAME}.pem"
echo ""
echo "  Next steps:"
echo "  1. Wait 2-3 minutes for instance to finish bootstrapping"
echo "  2. SSH in:  ssh -i ${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo "  3. Run:     cd /home/ubuntu/lms && git clone <your-repo> ."
echo "  4. Copy:    .env.production to the server"
echo "  5. Run:     docker compose up -d"
echo ""
echo "  GitHub Secrets to set:"
echo "    EC2_HOST     = $PUBLIC_IP"
echo "    EC2_USER     = ubuntu"
echo "    EC2_SSH_KEY  = (contents of ${KEY_NAME}.pem)"
echo "    AWS_ACCESS_KEY_ID     = (your key)"
echo "    AWS_SECRET_ACCESS_KEY = (your secret)"
echo "============================================================"
