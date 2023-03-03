#!/usr/bin/env bash

if [ -z "${GIT_PRIVATE_TOKEN}" ]
then
  echo "GIT_PRIVATE_TOKEN unset skipping"
else
  echo "GIT_PRIVATE_TOKEN is set configuring git credentials"

	git config --global credential.helper store
	git config --global --replace-all url.https://dev.sp-tarkov.com/.insteadOf ssh://git@github.com/
	git config --global --add url.https://dev.sp-tarkov.com/.insteadOf git@github.com

  git config --global url."https://$GIT_USER:$GIT_PRIVATE_TOKEN@dev.sp-tarkov.com/".insteadOf "https://dev.sp-tarkov.com/"
  git config --global url."https://$GIT_USER:$GIT_PRIVATE_TOKEN@dev.sp-tarkov.com/".insteadOf "ssh://git@dev.sp-tarkov.com/"
  git config --global url."https://$GIT_USER:$GIT_PRIVATE_TOKEN@dev.sp-tarkov.com/".insteadOf "git@dev.sp-tarkov.com:"

fi

echo "---------- git config --list -------------"
git config --list

echo "---------- git config --list --show-origin -------------"
git config --list --show-origin