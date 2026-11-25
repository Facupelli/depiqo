# Check the draft version through budget rendering

A budget PDF combines rental facts from multiple reads. Contracts reads the monotonic draft version before assembling those facts and checks it again after rendering, rather than returning a PDF that might combine different revisions of the persisted proposal. If the version changes, callers must retry from the current draft. The check covers rental facts; it is not a transaction over every contributing module.
