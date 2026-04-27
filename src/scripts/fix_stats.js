const fs = require('fs');

const filePath = 'src/screens/Stats.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const renderOverviewStart = content.indexOf("    const renderOverview = () => {");
const renderOverviewEnd = content.indexOf("  return (", renderOverviewStart);

const renderOverviewCode = content.substring(renderOverviewStart, renderOverviewEnd);

// Remove renderOverview from SessionCard
content = content.replace(renderOverviewCode, "");

// Find the main return (
const mainReturnStart = content.indexOf("  return (\n    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingTop: insets.top }]}>");

// Insert renderOverview right before main return
content = content.slice(0, mainReturnStart) + renderOverviewCode + content.slice(mainReturnStart);

fs.writeFileSync(filePath, content);
