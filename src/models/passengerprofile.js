'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PassengerProfile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PassengerProfile.associate = (m) => {
        PassengerProfile.belongsTo(m.User, {
          foreignKey: "user_id",
          as: "user",
          onDelete: "CASCADE",
        });
      };
    }
  }
  PassengerProfile.init({
    user_id: DataTypes.BIGINT,
    full_name: DataTypes.STRING,
    id_no: DataTypes.STRING,
    dob: DataTypes.DATE,
    phone: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'PassengerProfile',
  });
  return PassengerProfile;
};