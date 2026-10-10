#!/bin/sh

# A wee helper script to help make sure we pass all the millions of things
# Terraform needs passed to it, all from one environment file

set -e

ENV_FILE=terraform.env

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BETA_DIR="$SCRIPT_DIR/src/beta-app"
BETA_TF_DIR="$SCRIPT_DIR/src/beta-tf"

if [ ! -d "$BETA_TF_DIR" ]; then
    echo "Could not find beta project terraform at $BETA_TF_DIR"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]
then
    echo "You don't have a $ENV_FILE file with your terraform configuration in"
    echo "I'm going to make you a template one to fill in... Please edit it up then try again."
    (
        echo "# Details of the storage bucket where terraform state is kept"
        echo "TF_WORKSPACE_STORAGE_ACCOUNT_NAME=..."
        echo "TF_WORKSPACE_STORAGE_CONTAINER_NAME=..."
        echo "# Your own personal deployment name (must be unique!), eg 'dev-abs'"
        echo "TF_DEPLOYMENT_NAME=..."
    ) > "$ENV_FILE"
    exit
fi

source "./$ENV_FILE"

VARIABLES="-var=deployment_name=$TF_DEPLOYMENT_NAME"

BACKEND_CONFIG="-backend-config=storage_account_name=$TF_WORKSPACE_STORAGE_ACCOUNT_NAME -backend-config=container_name=$TF_WORKSPACE_STORAGE_CONTAINER_NAME key=$TF_DEPLOYMENT_NAME.tfstate"

# Operate from the tf directory
cd "$BETA_TF_DIR"

# See what command we're running so we can shove in the right arguments
COMMAND="$1"
shift

case $COMMAND in
    init)
        terraform init $BACKEND_CONFIG "$@"
        ;;
    fmt)
        terraform "$COMMAND" "$@"
        ;;
    validate|plan|apply|destroy)
        terraform workspace select --or-create=true $TF_DEPLOYMENT_NAME
        terraform "$COMMAND" $VARIABLES "$@"
        ;;
    *)
        terraform workspace select --or-create=true $TF_DEPLOYMENT_NAME
        terraform "$COMMAND" "$@"
        ;;
esac
