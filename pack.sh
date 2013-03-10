#!/bin/bash
if [ -f ./autogroup.xpi ]; then
  rm autogroup.xpi
fi
zip -r autogroup.xpi chrome defaults modules chrome.manifest install.rdf
