#!/bin/sh

# A wee helper script to help make sure we pass all the millions of things
# Terraform needs passed to it, all from one environment file

set -ex

if [ $# != 2 ]
then
    echo "USAGE: $0 <environment> <deployment>"
    echo "<environment> must be dev for now"
    exit
fi

ENVIRONMENT=$1
DEPLOYMENT=$2

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"
BETA_TF_DIR="$SCRIPT_DIR/src/beta-tf"

if [ ! -d "$BETA_TF_DIR" ]; then
    echo "Could not find beta project terraform at $BETA_TF_DIR"
    exit 1
fi

# This one isn't environment-specific
LOCATION=$AZURE_LOCATION

# Load env vars based on our environment
case $ENVIRONMENT in
    dev)
        RG_NAME="$AZURE_DEV_RG_NAME"
        PDNS_ZONE_NAME="$AZURE_DEV_PDNS_ZONE"
        VNET_NAME="$AZURE_DEV_VNET_NAME"
        LAW_NAME="$AZURE_DEV_LAW_NAME"
        SUBNET_ID="$AZURE_DEV_SUBNET_ID"

        WORKSPACE_TF="$AZURE_DEV_TF_WORKSPACE"
        ;;
esac


VARIABLES="-var=deployment_name=$DEPLOYMENT -var=location=$LOCATION -var=rg_name=$RG_NAME -var=pdns_zone_name=$PDNS_ZONE_NAME -var=vnet_name=$VNET_NAME -var=law_name=$LAW_NAME -var=subnet_id=$SUBNET_ID"

# Generate workspace.tf
echo "$WORKSPACE_TF" > "$BETA_TF_DIR/workspace.tf"

BACKEND_CONFIG="-backend-config=key=$DEPLOYMENT.tfstate"

# Operate from the tf directory
cd "$BETA_TF_DIR"

terraform workspace select --or-create=true $DEPLOYMENT
terraform $BACKEND_CONFIG init
terraform apply -auto-approve $VARIABLES
