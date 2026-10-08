#!/usr/bin/env bash

set -euo pipefail

readonly SCOPE="@cgaravitoq"
readonly PACKAGE="${SCOPE}/claude-code-core"
readonly NPMJS="https://registry.npmjs.org"
readonly GITHUB_PACKAGES="https://npm.pkg.github.com"

usage() {
	echo "usage: $(basename "$0") <version> [--dry-run]" >&2
	exit 1
}

version=""
dry_run=""
for argument in "$@"; do
	case "$argument" in
		--dry-run) dry_run="1" ;;
		-*) usage ;;
		*)
			if [ -n "$version" ]; then
				usage
			fi
			version="${argument#v}"
			;;
	esac
done

if [ -z "$version" ]; then
	usage
fi

attempt=1
until npm view "${PACKAGE}@${version}" version --"${SCOPE}:registry=${NPMJS}" >/dev/null 2>&1; do
	if [ "${attempt}" -ge 30 ]; then
		echo "error: ${PACKAGE}@${version} is not on npmjs after 10 minutes, so there are no bytes to mirror" >&2
		exit 1
	fi
	echo "waiting for npmjs to serve ${PACKAGE}@${version}"
	attempt=$((attempt + 1))
	sleep 20
done

if npm view "${PACKAGE}@${version}" version --"${SCOPE}:registry=${GITHUB_PACKAGES}" >/dev/null 2>&1; then
	echo "${PACKAGE}@${version} is already on GitHub Packages"
	exit 0
fi

scratch="$(mktemp -d)"
trap 'rm -rf "${scratch}"' EXIT

packed="$(npm pack "${PACKAGE}@${version}" --"${SCOPE}:registry=${NPMJS}" --pack-destination "${scratch}" | tail -n 1)"
tarball="${scratch}/${packed}"
echo "packed ${PACKAGE}@${version} from npmjs as ${tarball}"

if [ -n "${dry_run}" ]; then
	npm publish "${tarball}" --"${SCOPE}:registry=${GITHUB_PACKAGES}" --dry-run
else
	npm publish "${tarball}" --"${SCOPE}:registry=${GITHUB_PACKAGES}"
fi
