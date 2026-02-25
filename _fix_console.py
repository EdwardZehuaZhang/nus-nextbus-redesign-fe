#!/usr/bin/env python3
"""Gate console.log/error calls in navigation.tsx polyline section behind __DEV__"""

with open('src/app/(app)/navigation.tsx', 'r') as f:
    content = f.read()

lines = content.split('\n')

# Line 1476 (0-indexed 1475) - wrap console.log in __DEV__ block
old_block_1 = '\n'.join(lines[1475:1480])
new_block_1 = """        if (__DEV__) {
          console.log('Generating polylines for internal route:', {
            routeCode: bestInternalRoute.routeCode,
            departure: bestInternalRoute.departureStop.name,
            arrival: bestInternalRoute.arrivalStop.name
          });
        }"""

content = content.replace(old_block_1, new_block_1)

# Re-split for updated content
lines = content.split('\n')

# Find and replace the second console.log (polylines generated)
for i, line in enumerate(lines):
    if 'Internal route polylines generated:' in line:
        old_block = '\n'.join(lines[i:i+4])
        new_block = """        if (__DEV__) {
          console.log('Internal route polylines generated:', {
            walkToStopPoints: polylines.walkToStop.length,
            busSegmentPoints: polylines.busSegment.length,
            walkFromStopPoints: polylines.walkFromStop.length
          });
        }"""
        content = content.replace(old_block, new_block)
        break

# Find and replace the console.error (Error generating...)
lines2 = content.split('\n')
for i, line in enumerate(lines2):
    if 'Error generating internal route polylines:' in line:
        old_line = line
        new_line = '        if (__DEV__) console.error(' + line.split('console.error(', 1)[1]
        content = content.replace(old_line, new_line, 1)
        break

with open('src/app/(app)/navigation.tsx', 'w') as f:
    f.write(content)

print('Done - polyline console.log calls gated behind __DEV__')
