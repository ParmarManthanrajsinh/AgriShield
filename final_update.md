## map feature police

# Map Feature Improvements

## Issues to Fix

### 1. Add Farm Edit Functionality

* Allow users to edit an existing farm's details directly from the map.
* Users should be able to update:

  * Farm boundary
  * Farm name
  * Farm location
  * Any associated farm information

### 2. Add Farm Delete Functionality

* Provide an option to permanently delete a farm from the map.
* Display a confirmation dialog before deletion to prevent accidental removal.

### 3. Enable Location Search

* Add a search bar that allows users to search for locations by:

  * City name
  * State name
  * Country name
* Selecting a search result should automatically navigate and zoom the map to the chosen location.

### 4. Set India as the Default Map

* The map is currently centered on an incorrect country.
* Update the default map configuration so that:

  * The initial map view is centered on **India**.
  * The default zoom level provides a clear view of the country.
  * New users see India immediately upon opening the map.

## Expected Outcome

After implementing these changes:

* Users can **create**, **edit**, and **delete** farm locations.
* Users can quickly search for any city, state, or country from the map.
* The map opens with **India** as the default view instead of another country.
* Overall map usability and navigation are significantly improved.



## crop recomendation 

is crop recomendation really analyse the real farm and give the suggesion accordingly or is this just give the some randome things or mock data or sommthing 
how much is it accurate and what are the things is it using 

1. Hyper-Local Soil API (SoilGrids):
Current: State-level CSV lookup for soil & pH.
Upgrade: Fetch exact 250m-resolution soil properties (clay/sand/silt/pH/organic carbon) from free ISRIC SoilGrids API using farm polygon coordinates.

2. Mandi Market Price / ROI Optimization:
Upgrade: Pull live APMC/e-NAM market prices. If two crops both score >90%, rank higher the one with better market market price and profit margin.