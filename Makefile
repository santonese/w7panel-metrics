.PHONY: build-ui build-helm build-image push-zpk full check-version check-release release upgrade
VERSION ?=
CHART_NAME := w7panel-metrics
CHART_PACKAGE = ./$(CHART_NAME)-$(VERSION).tgz

check-version:
	@test -n "$(VERSION)" || { echo 'Set VERSION=x.y.z' >&2; exit 2; }

check-release: check-version
	@for tool in helm zpk; do command -v "$$tool" >/dev/null || { echo "Missing $$tool" >&2; exit 2; }; done
	@test -n "$${ZPK_IDC_PASSWORD:-$${PASSWORD:-}}" || { echo 'Set ZPK_IDC_PASSWORD or PASSWORD' >&2; exit 2; }

build-ui:
	@echo 'No UI to build'

build-helm: check-version
	helm package ./charts/w7panel-metrics --version "$(VERSION)" --app-version "$(VERSION)"

build-image:
	@echo 'No project image to build'

push-zpk: check-version
	@test -f "$(CHART_PACKAGE)" || { echo 'Helm package is missing' >&2; exit 1; }
	@test -n "$${ZPK_IDC_PASSWORD:-$${PASSWORD:-}}" || { echo 'Set ZPK_IDC_PASSWORD or PASSWORD' >&2; exit 2; }
	zpk login --username=w7admin --password="$${ZPK_IDC_PASSWORD:-$${PASSWORD}}" --host=zpk.w7.cc
	zpk use --name=w7panel-metrics
	zpk attach add --path="$(CHART_PACKAGE)" --type=helm
	zpk push

.NOTPARALLEL: full
full: check-release build-ui build-helm build-image push-zpk

release:
	helm package ./charts/w7panel-metrics
upgrade:
	helm upgrade w7panel-metrics ./charts/w7panel-metrics
downZpk:
	wget https://gh-proxy.org/https://github.com/w7panel/w7panel-zpk/releases/download/latest/w7-zpk_linux_amd64 -O /tmp/zpk 
	chmod +x /tmp/zpk
	sudo mv /tmp/zpk /usr/local/bin/
login:
	zpk login --username=w7admin --password=${PASSWORD} --host=zpk.w7.cc
publish: VERSION = $(shell sed -n 's/^version:[[:space:]]*//p' charts/w7panel-metrics/Chart.yaml | head -n 1)
publish:
	zpk use --name=w7panel-metrics
	zpk attach add --path="$(CHART_PACKAGE)" --type=helm
	zpk push
