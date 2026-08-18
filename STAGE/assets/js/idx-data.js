/* Marie Borders — IDX sample dataset (RESO Data Dictionary shape)
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 *
 * The real feed is the Bridge Interactive / RESO reference server:
 *     https://api.bridgedataoutput.com/api/v2/OData/abor_ref/Property
 * It is free but token-gated (403 "Invalid access_token format" without one).
 * Register at https://bridgedataoutput.com/register/actris_ref — Bridge emails
 * the credentials. Until that token exists, this file feeds the UI so the
 * design can be reviewed.
 *
 * EVERY RECORD BELOW IS FICTIONAL. Invented street names, invented MLS
 * numbers, invented agents. Nothing here is a real property or a real person
 * — this repo is public. Do not add real listing data to this file.
 *
 * The field names ARE real: they are RESO Data Dictionary 1.7 names, exactly
 * as the live Property resource returns them. That is the point — idx.js reads
 * these names and only these names, so switching SOURCE to 'live' in idx.js
 * changes where records come from and nothing about how they render.
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';
  window.MB = window.MB || {};
  MB.idxSampleData = [
    {
      ListingKey: 'REF-100241', ListingId: 'MRN100241',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 2495000, ClosePrice: null,
      StreetNumber: '14', StreetName: 'Heronwood Lane',
      UnparsedAddress: '14 Heronwood Lane, Mill Valley, CA 94941',
      City: 'Mill Valley', StateOrProvince: 'CA', PostalCode: '94941',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 4, BathroomsFull: 3, BathroomsHalf: 1, BathroomsTotalInteger: 4,
      LivingArea: 2840, LotSizeAcres: 0.24, YearBuilt: 1948,
      GarageSpaces: 2, PoolPrivateYN: false,
      DaysOnMarket: 11, OnMarketDate: '2026-08-07',
      ListOfficeName: 'Ridgeline Properties', ListAgentFullName: 'A. Sample',
      PublicRemarks: 'A shingled mid-century set back behind a stand of redwoods, remodeled with restraint. Walls of glass in the main room open to a level lawn — rare on this side of the ridge. The kitchen opens to a covered terrace built for long dinners. Two bedrooms down, primary suite up with a reading alcove under the eaves.',
      Media: [
        { MediaURL: 'placeholder:Redwood Approach', Order: 0 },
        { MediaURL: 'placeholder:Great Room', Order: 1 },
        { MediaURL: 'placeholder:Kitchen & Terrace', Order: 2 },
        { MediaURL: 'placeholder:Primary Suite', Order: 3 }
      ]
    },
    {
      ListingKey: 'REF-100288', ListingId: 'MRN100288',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 1795000, ClosePrice: null,
      StreetNumber: '208', StreetName: 'Cypress Bend',
      UnparsedAddress: '208 Cypress Bend, Novato, CA 94947',
      City: 'Novato', StateOrProvince: 'CA', PostalCode: '94947',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 3, BathroomsFull: 2, BathroomsHalf: 0, BathroomsTotalInteger: 2,
      LivingArea: 1960, LotSizeAcres: 0.31, YearBuilt: 1979,
      GarageSpaces: 2, PoolPrivateYN: true,
      DaysOnMarket: 4, OnMarketDate: '2026-08-14',
      ListOfficeName: 'Bayfront Realty Group', ListAgentFullName: 'B. Sample',
      PublicRemarks: 'Single-level living on a quiet cul-de-sac, with a pool that gets sun from late morning straight through the afternoon. Open plan through the kitchen and family room, a separate front room for guests, and a flat rear yard with mature olive trees.',
      Media: [
        { MediaURL: 'placeholder:Front Elevation', Order: 0 },
        { MediaURL: 'placeholder:Pool & Yard', Order: 1 },
        { MediaURL: 'placeholder:Family Room', Order: 2 }
      ]
    },
    {
      ListingKey: 'REF-100310', ListingId: 'MRN100310',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 3650000, ClosePrice: null,
      StreetNumber: '9', StreetName: 'Tiburon Vista Court',
      UnparsedAddress: '9 Tiburon Vista Court, Tiburon, CA 94920',
      City: 'Tiburon', StateOrProvince: 'CA', PostalCode: '94920',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 5, BathroomsFull: 4, BathroomsHalf: 1, BathroomsTotalInteger: 5,
      LivingArea: 4120, LotSizeAcres: 0.42, YearBuilt: 2004,
      GarageSpaces: 3, PoolPrivateYN: true,
      DaysOnMarket: 26, OnMarketDate: '2026-07-23',
      ListOfficeName: 'Harbor & Hill', ListAgentFullName: 'C. Sample',
      PublicRemarks: 'Bay and bridge views from nearly every room. Built in 2004 and lightly lived in since, with a proper entry hall, a chef kitchen opening to the loggia, and a lower level laid out for guests or an au pair. Terraced garden steps down to a level pad with a pool and outdoor kitchen.',
      Media: [
        { MediaURL: 'placeholder:Bay View', Order: 0 },
        { MediaURL: 'placeholder:Entry Hall', Order: 1 },
        { MediaURL: 'placeholder:Loggia', Order: 2 },
        { MediaURL: 'placeholder:Pool Terrace', Order: 3 }
      ]
    },
    {
      ListingKey: 'REF-100355', ListingId: 'MRN100355',
      StandardStatus: 'Pending', MlsStatus: 'Pending',
      ListPrice: 1295000, ClosePrice: null,
      StreetNumber: '61', StreetName: 'Larkspur Row',
      UnparsedAddress: '61 Larkspur Row, San Rafael, CA 94901',
      City: 'San Rafael', StateOrProvince: 'CA', PostalCode: '94901',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Townhouse',
      BedroomsTotal: 3, BathroomsFull: 2, BathroomsHalf: 1, BathroomsTotalInteger: 3,
      LivingArea: 1640, LotSizeAcres: 0.05, YearBuilt: 1996,
      GarageSpaces: 2, PoolPrivateYN: false,
      DaysOnMarket: 19, OnMarketDate: '2026-07-30',
      ListOfficeName: 'Marin Collective', ListAgentFullName: 'D. Sample',
      PublicRemarks: 'End-unit townhome with only one shared wall and a private patio that backs to open space. Updated kitchen, newer windows throughout, and an attached two-car garage with interior access — unusual at this price in central San Rafael.',
      Media: [
        { MediaURL: 'placeholder:End Unit', Order: 0 },
        { MediaURL: 'placeholder:Patio', Order: 1 }
      ]
    },
    {
      ListingKey: 'REF-100377', ListingId: 'MRN100377',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 985000, ClosePrice: null,
      StreetNumber: '440', StreetName: 'Miller Creek Road',
      UnparsedAddress: '440 Miller Creek Road, San Rafael, CA 94903',
      City: 'San Rafael', StateOrProvince: 'CA', PostalCode: '94903',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Condominium',
      BedroomsTotal: 2, BathroomsFull: 2, BathroomsHalf: 0, BathroomsTotalInteger: 2,
      LivingArea: 1180, LotSizeAcres: null, YearBuilt: 1985,
      GarageSpaces: 1, PoolPrivateYN: false, AssociationFee: 545,
      DaysOnMarket: 2, OnMarketDate: '2026-08-16',
      ListOfficeName: 'Northgate Realty', ListAgentFullName: 'E. Sample',
      PublicRemarks: 'Top-floor corner unit with vaulted ceilings and a creekside outlook from the deck. Both bedrooms are true suites, set on opposite sides of the living space. Deeded garage parking and in-unit laundry.',
      Media: [
        { MediaURL: 'placeholder:Creekside Deck', Order: 0 },
        { MediaURL: 'placeholder:Vaulted Living', Order: 1 }
      ]
    },
    {
      ListingKey: 'REF-100392', ListingId: 'MRN100392',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 5250000, ClosePrice: null,
      StreetNumber: '3', StreetName: 'Ross Common Way',
      UnparsedAddress: '3 Ross Common Way, Ross, CA 94957',
      City: 'Ross', StateOrProvince: 'CA', PostalCode: '94957',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 5, BathroomsFull: 4, BathroomsHalf: 2, BathroomsTotalInteger: 6,
      LivingArea: 5380, LotSizeAcres: 0.88, YearBuilt: 1912,
      GarageSpaces: 2, PoolPrivateYN: true,
      DaysOnMarket: 47, OnMarketDate: '2026-07-02',
      ListOfficeName: 'Ross Valley Estates', ListAgentFullName: 'F. Sample',
      PublicRemarks: 'A 1912 estate on nearly an acre of flat, usable land behind a hedge. Restored over three years with the original millwork, coffered ceilings and leaded glass intact, and a kitchen and baths quietly brought current. Pool house, rose garden, and a detached studio.',
      Media: [
        { MediaURL: 'placeholder:Estate Facade', Order: 0 },
        { MediaURL: 'placeholder:Original Millwork', Order: 1 },
        { MediaURL: 'placeholder:Rose Garden', Order: 2 },
        { MediaURL: 'placeholder:Pool House', Order: 3 }
      ]
    },
    {
      ListingKey: 'REF-100418', ListingId: 'MRN100418',
      StandardStatus: 'Closed', MlsStatus: 'Closed',
      ListPrice: 1650000, ClosePrice: 1725000,
      StreetNumber: '77', StreetName: 'Corte Almeria',
      UnparsedAddress: '77 Corte Almeria, Greenbrae, CA 94904',
      City: 'Greenbrae', StateOrProvince: 'CA', PostalCode: '94904',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 3, BathroomsFull: 2, BathroomsHalf: 0, BathroomsTotalInteger: 2,
      LivingArea: 1820, LotSizeAcres: 0.19, YearBuilt: 1963,
      GarageSpaces: 2, PoolPrivateYN: false,
      DaysOnMarket: 9, OnMarketDate: '2026-06-11', CloseDate: '2026-07-24',
      ListOfficeName: 'Bayfront Realty Group', ListAgentFullName: 'G. Sample',
      PublicRemarks: 'Sold with multiple offers after nine days. Single-level ranch with a reworked floor plan, refinished oak floors, and a west-facing yard that holds the afternoon light.',
      Media: [
        { MediaURL: 'placeholder:Ranch Exterior', Order: 0 },
        { MediaURL: 'placeholder:Oak Floors', Order: 1 }
      ]
    },
    {
      ListingKey: 'REF-100433', ListingId: 'MRN100433',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 2150000, ClosePrice: null,
      StreetNumber: '18', StreetName: 'Sausalito Overlook',
      UnparsedAddress: '18 Sausalito Overlook, Sausalito, CA 94965',
      City: 'Sausalito', StateOrProvince: 'CA', PostalCode: '94965',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 3, BathroomsFull: 2, BathroomsHalf: 1, BathroomsTotalInteger: 3,
      LivingArea: 2210, LotSizeAcres: 0.11, YearBuilt: 1971,
      GarageSpaces: 1, PoolPrivateYN: false,
      DaysOnMarket: 33, OnMarketDate: '2026-07-16',
      ListOfficeName: 'Harbor & Hill', ListAgentFullName: 'H. Sample',
      PublicRemarks: 'Built into the hillside with three decks stepping down toward the water. The main level is one continuous room — kitchen, dining, living — with the view running the full width. Two bedrooms below open to a sheltered garden.',
      Media: [
        { MediaURL: 'placeholder:Harbor Outlook', Order: 0 },
        { MediaURL: 'placeholder:Main Level', Order: 1 },
        { MediaURL: 'placeholder:Stepped Decks', Order: 2 }
      ]
    },
    {
      ListingKey: 'REF-100467', ListingId: 'MRN100467',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 749000, ClosePrice: null,
      StreetNumber: '1250', StreetName: 'Ignacio Boulevard',
      UnparsedAddress: '1250 Ignacio Boulevard, Novato, CA 94949',
      City: 'Novato', StateOrProvince: 'CA', PostalCode: '94949',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Condominium',
      BedroomsTotal: 2, BathroomsFull: 1, BathroomsHalf: 1, BathroomsTotalInteger: 2,
      LivingArea: 1040, LotSizeAcres: null, YearBuilt: 1988,
      GarageSpaces: 1, PoolPrivateYN: false, AssociationFee: 480,
      DaysOnMarket: 7, OnMarketDate: '2026-08-11',
      ListOfficeName: 'Northgate Realty', ListAgentFullName: 'I. Sample',
      PublicRemarks: 'Ground-floor unit with a private entry and a fenced patio — no stairs anywhere. Updated two years ago with new flooring, quartz counters and a rebuilt bath. Complex has a pool and is minutes from the 101.',
      Media: [
        { MediaURL: 'placeholder:Private Entry', Order: 0 },
        { MediaURL: 'placeholder:Fenced Patio', Order: 1 }
      ]
    },
    {
      ListingKey: 'REF-100489', ListingId: 'MRN100489',
      StandardStatus: 'Pending', MlsStatus: 'Pending',
      ListPrice: 4100000, ClosePrice: null,
      StreetNumber: '52', StreetName: 'Belvedere Shore',
      UnparsedAddress: '52 Belvedere Shore, Belvedere, CA 94920',
      City: 'Belvedere', StateOrProvince: 'CA', PostalCode: '94920',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 4, BathroomsFull: 3, BathroomsHalf: 1, BathroomsTotalInteger: 4,
      LivingArea: 3340, LotSizeAcres: 0.28, YearBuilt: 1989,
      GarageSpaces: 2, PoolPrivateYN: false,
      DaysOnMarket: 22, OnMarketDate: '2026-07-27',
      ListOfficeName: 'Ridgeline Properties', ListAgentFullName: 'J. Sample',
      PublicRemarks: 'Waterside with a deep-water dock and southern exposure across the lagoon. Rebuilt in 1989 and updated since, with the main living level opening entirely to a waterfront terrace.',
      Media: [
        { MediaURL: 'placeholder:Waterfront Terrace', Order: 0 },
        { MediaURL: 'placeholder:Dock', Order: 1 },
        { MediaURL: 'placeholder:Living Level', Order: 2 }
      ]
    },
    {
      ListingKey: 'REF-100502', ListingId: 'MRN100502',
      StandardStatus: 'Active', MlsStatus: 'Active',
      ListPrice: 1425000, ClosePrice: null,
      StreetNumber: '31', StreetName: 'Fairfax Grade',
      UnparsedAddress: '31 Fairfax Grade, Fairfax, CA 94930',
      City: 'Fairfax', StateOrProvince: 'CA', PostalCode: '94930',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 3, BathroomsFull: 2, BathroomsHalf: 0, BathroomsTotalInteger: 2,
      LivingArea: 1580, LotSizeAcres: 0.35, YearBuilt: 1936,
      GarageSpaces: 0, PoolPrivateYN: false,
      DaysOnMarket: 14, OnMarketDate: '2026-08-04',
      ListOfficeName: 'Marin Collective', ListAgentFullName: 'K. Sample',
      PublicRemarks: 'A 1936 cottage that has been carefully kept — original fir floors, a wood stove, and a deep front porch. The lot climbs to a flat terrace with fruit trees and a studio outbuilding wired for work.',
      Media: [
        { MediaURL: 'placeholder:Cottage Porch', Order: 0 },
        { MediaURL: 'placeholder:Fir Floors', Order: 1 },
        { MediaURL: 'placeholder:Garden Studio', Order: 2 }
      ]
    },
    {
      ListingKey: 'REF-100544', ListingId: 'MRN100544',
      StandardStatus: 'Closed', MlsStatus: 'Closed',
      ListPrice: 2950000, ClosePrice: 2860000,
      StreetNumber: '105', StreetName: 'Corte Madera Vista',
      UnparsedAddress: '105 Corte Madera Vista, Corte Madera, CA 94925',
      City: 'Corte Madera', StateOrProvince: 'CA', PostalCode: '94925',
      CountyOrParish: 'Marin',
      PropertyType: 'Residential', PropertySubType: 'Single Family Residence',
      BedroomsTotal: 4, BathroomsFull: 3, BathroomsHalf: 0, BathroomsTotalInteger: 3,
      LivingArea: 2980, LotSizeAcres: 0.26, YearBuilt: 2016,
      GarageSpaces: 2, PoolPrivateYN: false,
      DaysOnMarket: 38, OnMarketDate: '2026-05-19', CloseDate: '2026-07-08',
      ListOfficeName: 'Ross Valley Estates', ListAgentFullName: 'L. Sample',
      PublicRemarks: 'Newer construction on a knoll with valley views to the west. Four bedrooms including a ground-floor suite, a scullery off the main kitchen, and owned solar with battery backup.',
      Media: [
        { MediaURL: 'placeholder:Valley View', Order: 0 },
        { MediaURL: 'placeholder:Main Kitchen', Order: 1 }
      ]
    }
  ];
})();
